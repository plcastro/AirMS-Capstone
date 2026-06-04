from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from services.mongo import get_db
from storage import save_upload
from utils.mongo_helpers import parse_object_id, to_jsonable

blueprint = Blueprint("message", __name__)


def _messages():
    return get_db()["messages"]


def _conversations():
    return get_db()["conversations"]


def _users():
    return get_db()["users"]


def _now():
    return datetime.utcnow()


def _serialize_user(user_doc):
    if not user_doc:
        return None
    data = to_jsonable(dict(user_doc))
    data.pop("password", None)
    data.pop("passwordHash", None)
    return data


def _user_by_id(user_id):
    if not user_id:
        return None
    oid = parse_object_id(user_id)
    if oid:
        user = _users().find_one({"_id": oid})
        if user:
            return user
    return _users().find_one({"$or": [{"id": user_id}, {"_id": user_id}]})


def _normalize_attachments(doc):
    attachments = doc.get("attachments") or []
    normalized = []
    for item in attachments:
        if not isinstance(item, dict):
            continue
        normalized.append(
            {
                "url": item.get("url") or item.get("path") or "",
                "name": item.get("name") or item.get("filename") or "Attachment",
                "mimeType": item.get("mimeType") or item.get("type") or "",
                "size": item.get("size"),
                "kind": item.get("kind")
                or ("image" if str(item.get("mimeType") or item.get("type") or "").startswith("image/") else "file"),
            }
        )
    return normalized


def _serialize_message(doc):
    data = to_jsonable(dict(doc or {}))
    data["attachments"] = _normalize_attachments(data)
    sender_id = str(data.get("from") or data.get("sender") or "")
    recipient_id = str(data.get("to") or data.get("recipient") or "")
    conversation_id = str(data.get("conversationId") or data.get("conversation") or "")
    if sender_id and not data.get("sender"):
        data["sender"] = sender_id
    if recipient_id and not data.get("recipient"):
        data["recipient"] = recipient_id
    if conversation_id and not data.get("conversation"):
        data["conversation"] = conversation_id
    return data


def _conversation_sort_key(doc):
    value = doc.get("updatedAt") or doc.get("createdAt") or doc.get("lastMessage", {}).get("createdAt") or doc.get("_id")
    if isinstance(value, datetime):
        return value.timestamp()
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).timestamp()
    except Exception:
        return 0.0


def _direct_conversations_for(me):
    inbox = []
    seen = set()
    query = {"$or": [{"from": me}, {"to": me}, {"recipient": me}]}
    for message in _messages().find(query).sort([("createdAt", -1), ("_id", -1)]):
        sender = str(message.get("from") or message.get("sender") or "")
        recipient = str(message.get("to") or message.get("recipient") or "")
        other_user_id = recipient if sender == str(me) else sender
        if not other_user_id or other_user_id == str(me) or other_user_id in seen:
            continue
        seen.add(other_user_id)
        latest_message = _messages().find_one(
            {
                "$or": [
                    {"from": str(me), "to": other_user_id},
                    {"from": other_user_id, "to": str(me)},
                    {"sender": str(me), "recipient": other_user_id},
                    {"sender": other_user_id, "recipient": str(me)},
                ]
            },
            sort=[("createdAt", -1), ("_id", -1)],
        )
        unread_count = _messages().count_documents(
            {
                "$or": [
                    {"from": other_user_id, "to": str(me)},
                    {"sender": other_user_id, "recipient": str(me)},
                ],
                "read": {"$ne": True},
            }
        )
        user = _user_by_id(other_user_id)
        inbox.append(
            {
                "id": other_user_id,
                "type": "direct",
                "user": _serialize_user(user) if user else {"_id": other_user_id, "id": other_user_id, "username": other_user_id},
                "title": (user.get("firstName") or user.get("lastName") or user.get("username")) if user else other_user_id,
                "subtitle": (user.get("jobTitle") if user else "") or "User",
                "lastMessage": _serialize_message(latest_message) if latest_message else None,
                "unreadCount": unread_count,
                "updatedAt": latest_message.get("createdAt") if latest_message else None,
            }
        )
    return inbox


def _group_conversations():
    groups = []
    for doc in _conversations().find({"type": "group"}).sort([("updatedAt", -1), ("_id", -1)]):
        conversation = dict(doc)
        group = conversation.get("group") or {}
        member_ids = conversation.get("participants") or conversation.get("memberIds") or group.get("memberIds") or []
        members = []
        seen_members = set()
        for member_id in member_ids:
            member_key = str(member_id)
            if member_key in seen_members:
                continue
            seen_members.add(member_key)
            user = _user_by_id(str(member_id))
            if user:
                members.append(_serialize_user(user))
        conversation["group"] = {
            "name": group.get("name") or conversation.get("name") or "Group chat",
            "members": members,
        }
        conversation["id"] = str(conversation.get("_id"))
        conversation["type"] = "group"
        conversation["unreadCount"] = _messages().count_documents(
            {
                "$or": [
                    {"conversation": str(conversation.get("_id"))},
                    {"conversationId": str(conversation.get("_id"))},
                ],
                "read": {"$ne": True},
            }
        )
        latest = _messages().find_one(
            {
                "$or": [
                    {"conversation": str(conversation.get("_id"))},
                    {"conversationId": str(conversation.get("_id"))},
                ]
            },
            sort=[("createdAt", -1), ("_id", -1)],
        )
        conversation["lastMessage"] = _serialize_message(latest) if latest else None
        groups.append(conversation)
    return groups


@blueprint.get("/users")
@jwt_required()
def users():
    docs = list(_users().find({}, {"password": 0, "passwordHash": 0, "pin": 0, "pinHash": 0}))
    return jsonify({"success": True, "data": to_jsonable(docs)})


@blueprint.get("/conversations")
@jwt_required()
def conversations():
    me = str(get_jwt_identity())
    docs = _group_conversations() + _direct_conversations_for(me)
    docs.sort(key=_conversation_sort_key, reverse=True)
    return jsonify({"success": True, "data": to_jsonable(docs)})


@blueprint.get("/summary")
@jwt_required()
def summary():
    me = str(get_jwt_identity())
    unread = _messages().count_documents(
        {
            "$or": [
                {"to": me},
                {"recipient": me},
            ],
            "read": {"$ne": True},
        }
    )
    return jsonify({"success": True, "unread": unread})


@blueprint.post("/groups")
@jwt_required()
def create_group():
    body = request.get_json(silent=True) or {}
    member_ids = [str(member_id) for member_id in (body.get("memberIds") or []) if str(member_id).strip()]
    current_user_id = str(get_jwt_identity())
    if current_user_id and current_user_id not in member_ids:
        member_ids.append(current_user_id)

    members = []
    for member_id in member_ids:
        user = _user_by_id(member_id)
        if user:
            members.append(_serialize_user(user))

    group_doc = {
        "type": "group",
        "name": str(body.get("name") or body.get("groupName") or "Group chat").strip(),
        "participants": member_ids,
        "memberIds": member_ids,
        "group": {
            "name": str(body.get("name") or body.get("groupName") or "Group chat").strip(),
            "members": members,
        },
        "createdAt": _now(),
        "updatedAt": _now(),
    }
    result = _conversations().insert_one(group_doc)
    group_doc["_id"] = result.inserted_id
    group_doc["id"] = str(result.inserted_id)
    return jsonify({"success": True, "data": {"group": to_jsonable(group_doc)}}), 201


@blueprint.get("/<other_user_id>")
@jwt_required()
def thread(other_user_id):
    me = str(get_jwt_identity())
    messages = list(
        _messages()
        .find(
            {
                "$or": [
                    {"from": me, "to": other_user_id},
                    {"from": other_user_id, "to": me},
                    {"sender": me, "recipient": other_user_id},
                    {"sender": other_user_id, "recipient": me},
                    {"conversation": other_user_id},
                    {"conversationId": other_user_id},
                ]
            }
        )
        .sort("createdAt", 1)
    )
    return jsonify({"success": True, "data": [to_jsonable(_serialize_message(doc)) for doc in messages]})


@blueprint.post("/")
@jwt_required()
def send_message():
    form = request.form or {}
    payload = request.get_json(silent=True) or {}
    body_text = str(form.get("body") or payload.get("body") or "").strip()
    recipient_id = str(form.get("recipientId") or payload.get("recipientId") or payload.get("recipient") or "").strip()
    conversation_id = str(form.get("conversationId") or payload.get("conversationId") or payload.get("conversation") or "").strip()
    sender_id = str(get_jwt_identity())

    attachments = []
    for file_storage in request.files.getlist("attachments"):
        filename, _ = save_upload(file_storage)
        attachments.append(
            {
                "url": f"/uploads/{filename}",
                "name": file_storage.filename,
                "mimeType": file_storage.mimetype,
                "size": file_storage.content_length,
                "kind": "image" if str(file_storage.mimetype or "").startswith("image/") else "file",
            }
        )

    doc = {
        "body": body_text,
        "attachments": attachments,
        "from": sender_id,
        "sender": sender_id,
        "read": False,
        "createdAt": _now(),
        "updatedAt": _now(),
    }
    if conversation_id:
        doc["conversation"] = conversation_id
        doc["conversationId"] = conversation_id
    if recipient_id:
        doc["to"] = recipient_id
        doc["recipient"] = recipient_id

    result = _messages().insert_one(doc)
    doc["_id"] = result.inserted_id
    if conversation_id:
        conversation_oid = parse_object_id(conversation_id)
        conversation_query = {"_id": conversation_oid} if conversation_oid else {"_id": conversation_id}
        _conversations().update_one(
            conversation_query,
            {
                "$set": {
                    "updatedAt": _now(),
                    "lastMessage": _serialize_message(doc),
                }
            },
        )
    return jsonify({"success": True, "data": _serialize_message(doc)}), 201
