import os
import secrets
from datetime import datetime, timezone
from pathlib import Path

import jwt
from bson import ObjectId
from flask import Blueprint, jsonify, request
from werkzeug.utils import secure_filename

try:
    from db import get_db
except ImportError:
    import sys

    sys.path.append(str(Path(__file__).resolve().parents[1]))
    from db import get_db

msg_bp = Blueprint("messages_api", __name__, url_prefix="/api/messages")


def _utcnow():
    return datetime.now(timezone.utc)


def _object_id(value):
    try:
        return ObjectId(str(value))
    except Exception:
        return None


def _get_bearer_token():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.lower().startswith("bearer "):
        return None
    return auth_header.split(" ", 1)[1].strip()


def _current_user_id():
    token = _get_bearer_token()
    if not token:
        return None
    try:
        payload = jwt.decode(
            token,
            os.getenv("JWT_SECRET", "dev-jwt-secret"),
            algorithms=["HS256"],
        )
        return str(payload.get("id") or payload.get("sub") or "")
    except Exception:
        return None


def _jsonable(value):
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [_jsonable(item) for item in value]
    if isinstance(value, dict):
        return {key: _jsonable(item) for key, item in value.items()}
    return value


def _map_user(user=None):
    user = user or {}
    return {
        "_id": str(user.get("_id")),
        "id": str(user.get("_id")),
        "firstName": user.get("firstName"),
        "lastName": user.get("lastName"),
        "username": user.get("username"),
        "email": user.get("email"),
        "jobTitle": user.get("jobTitle"),
        "image": user.get("image"),
        "isOnline": bool(user.get("isOnline", False)),
        "platform": user.get("platform"),
    }


def _map_message(message=None):
    message = message or {}
    return {
        "_id": str(message.get("_id")),
        "sender": _jsonable(message.get("sender")),
        "recipient": _jsonable(message.get("recipient")),
        "conversation": _jsonable(message.get("conversation")),
        "body": message.get("body", ""),
        "attachments": _jsonable(message.get("attachments", [])),
        "readAt": _jsonable(message.get("readAt")),
        "readBy": _jsonable(message.get("readBy", [])),
        "createdAt": _jsonable(message.get("createdAt")),
        "updatedAt": _jsonable(message.get("updatedAt")),
    }


def _map_group(conversation=None, members=None):
    conversation = conversation or {}
    return {
        "_id": str(conversation.get("_id")),
        "id": str(conversation.get("_id")),
        "type": "group",
        "name": conversation.get("name"),
        "members": [_map_user(member) for member in (members or [])],
        "createdBy": _jsonable(conversation.get("createdBy")),
        "createdAt": _jsonable(conversation.get("createdAt")),
        "updatedAt": _jsonable(conversation.get("updatedAt")),
    }


def _require_user():
    user_id = _current_user_id()
    oid = _object_id(user_id)
    if not oid:
        return None, None
    return user_id, oid


@msg_bp.get("/users")
def users():
    user_id, user_oid = _require_user()
    if not user_oid:
        return jsonify({"message": "Unauthorized"}), 401

    db = get_db()
    rows = list(
        db.users.find(
            {"_id": {"$ne": user_oid}, "status": {"$ne": "deactivated"}},
            {
                "firstName": 1,
                "lastName": 1,
                "username": 1,
                "email": 1,
                "image": 1,
                "jobTitle": 1,
                "isOnline": 1,
                "platform": 1,
            },
        ).sort([("firstName", 1), ("lastName", 1), ("username", 1)])
    )
    return jsonify({"success": True, "data": [_map_user(row) for row in rows]})


@msg_bp.get("/conversations")
def conversations():
    user_id, user_oid = _require_user()
    if not user_oid:
        return jsonify({"message": "Unauthorized"}), 401

    db = get_db()
    direct_messages = list(
        db.messages.find(
            {
                "$or": [{"sender": user_oid}, {"sender": user_id}, {"recipient": user_oid}, {"recipient": user_id}],
                "conversation": {"$in": [None, ""]},
            }
        )
        .sort("createdAt", -1)
        .limit(500)
    )

    user_ids = set()
    for message in direct_messages:
        sender = str(message.get("sender"))
        recipient = str(message.get("recipient"))
        other = recipient if sender == user_id else sender
        if _object_id(other):
            user_ids.add(ObjectId(other))
    users_by_id = {
        str(row["_id"]): row
        for row in db.users.find({"_id": {"$in": list(user_ids)}})
    }

    merged = {}
    for message in direct_messages:
        sender = str(message.get("sender"))
        recipient = str(message.get("recipient"))
        other_id = recipient if sender == user_id else sender
        other_user = users_by_id.get(other_id)
        if not other_user:
            continue
        key = f"direct:{other_id}"
        if key not in merged:
            merged[key] = {
                "type": "direct",
                "user": _map_user(other_user),
                "lastMessage": _map_message(message),
                "unreadCount": 0 if sender == user_id or message.get("readAt") else 1,
            }

    group_rows = list(
        db.conversations.find(
            {"members": {"$in": [user_oid, user_id]}, "type": "group"}
        ).sort("updatedAt", -1)
    )
    group_ids = [row["_id"] for row in group_rows]
    member_ids = set()
    for group in group_rows:
        for member in group.get("members", []):
            oid = _object_id(member)
            if oid:
                member_ids.add(oid)
    group_members_by_id = {
        str(row["_id"]): row for row in db.users.find({"_id": {"$in": list(member_ids)}})
    }
    last_group_messages = {}
    if group_ids:
        for message in db.messages.find({"conversation": {"$in": group_ids}}).sort("createdAt", -1).limit(800):
            key = str(message.get("conversation"))
            last_group_messages.setdefault(key, message)

    for group in group_rows:
        members = [
            group_members_by_id.get(str(member))
            for member in group.get("members", [])
            if group_members_by_id.get(str(member))
        ]
        last_message = last_group_messages.get(str(group["_id"]))
        merged[f"group:{group['_id']}"] = {
            "type": "group",
            "group": _map_group(group, members),
            "lastMessage": _map_message(last_message) if last_message else None,
            "unreadCount": 0,
        }

    data = sorted(
        merged.values(),
        key=lambda item: item.get("lastMessage", {}).get("createdAt") or item.get("group", {}).get("updatedAt") or "",
        reverse=True,
    )
    return jsonify({"success": True, "data": data})


@msg_bp.get("/<other_user_id>")
def thread(other_user_id):
    user_id, user_oid = _require_user()
    other_oid = _object_id(other_user_id)
    if not user_oid or not other_oid:
        return jsonify({"message": "Invalid conversation"}), 400

    db = get_db()
    group = db.conversations.find_one({"_id": other_oid, "members": {"$in": [user_oid, user_id]}})
    if group:
        rows = list(db.messages.find({"conversation": other_oid}).sort("createdAt", 1).limit(300))
        return jsonify({"success": True, "data": [_map_message(row) for row in rows]})

    db.messages.update_many(
        {"sender": other_oid, "recipient": user_oid, "readAt": None},
        {"$set": {"readAt": _utcnow()}},
    )
    rows = list(
        db.messages.find(
            {
                "conversation": {"$in": [None, ""]},
                "$or": [
                    {"sender": user_oid, "recipient": other_oid},
                    {"sender": other_oid, "recipient": user_oid},
                ],
            }
        )
        .sort("createdAt", 1)
        .limit(300)
    )
    return jsonify({"success": True, "data": [_map_message(row) for row in rows]})


def _saved_attachments():
    saved = []
    upload_dir = Path(__file__).resolve().parents[1] / "uploads" / "messages"
    upload_dir.mkdir(parents=True, exist_ok=True)
    for upload in request.files.getlist("attachments"):
        filename = secure_filename(upload.filename or "")
        if not filename:
            continue
        stored_name = f"{secrets.token_hex(8)}-{filename}"
        upload.save(upload_dir / stored_name)
        mime = upload.mimetype or ""
        saved.append(
            {
                "url": f"/uploads/messages/{stored_name}",
                "name": filename,
                "mimeType": mime,
                "size": (upload_dir / stored_name).stat().st_size,
                "kind": "image" if mime.startswith("image/") else "file",
            }
        )
    return saved


@msg_bp.post("")
def send_message():
    user_id, user_oid = _require_user()
    if not user_oid:
        return jsonify({"message": "Unauthorized"}), 401

    db = get_db()
    data = request.form if request.form else (request.get_json(silent=True) or {})
    body = str(data.get("body", "")).strip()
    recipient_id = str(data.get("recipientId", "")).strip()
    conversation_id = str(data.get("conversationId", "")).strip()
    attachments = _saved_attachments()

    if len(body) > 1000:
        return jsonify({"message": "Message is too long"}), 400
    if not body and not attachments:
        return jsonify({"message": "Message cannot be empty"}), 400

    now = _utcnow()
    if conversation_id:
        conversation_oid = _object_id(conversation_id)
        conversation = db.conversations.find_one(
            {"_id": conversation_oid, "members": {"$in": [user_oid, user_id]}}
        )
        if not conversation:
            return jsonify({"message": "Group conversation not found"}), 404
        doc = {
            "sender": user_oid,
            "conversation": conversation_oid,
            "body": body,
            "attachments": attachments,
            "readBy": [{"user": user_oid, "readAt": now}],
            "createdAt": now,
            "updatedAt": now,
        }
        db.messages.insert_one(doc)
        db.conversations.update_one({"_id": conversation_oid}, {"$set": {"updatedAt": now}})
        return jsonify({"success": True, "data": _map_message(doc)}), 201

    recipient_oid = _object_id(recipient_id)
    if not recipient_oid:
        return jsonify({"message": "Select a valid recipient"}), 400
    if str(recipient_oid) == user_id:
        return jsonify({"message": "You cannot message yourself"}), 400
    if not db.users.find_one({"_id": recipient_oid, "status": {"$ne": "deactivated"}}):
        return jsonify({"message": "Recipient not found"}), 404

    doc = {
        "sender": user_oid,
        "recipient": recipient_oid,
        "body": body,
        "attachments": attachments,
        "createdAt": now,
        "updatedAt": now,
        "readAt": None,
    }
    db.messages.insert_one(doc)
    return jsonify({"success": True, "data": _map_message(doc)}), 201


@msg_bp.post("/groups")
def create_group():
    user_id, user_oid = _require_user()
    if not user_oid:
        return jsonify({"message": "Unauthorized"}), 401

    db = get_db()
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    if not name:
        return jsonify({"message": "Group name is required"}), 400
    if len(name) > 80:
        return jsonify({"message": "Group name is too long"}), 400

    member_ids = [str(item) for item in data.get("memberIds", [])]
    member_oids = {user_oid}
    for member_id in member_ids:
        oid = _object_id(member_id)
        if oid:
            member_oids.add(oid)
    if len(member_oids) < 2:
        return jsonify({"message": "Select at least one group member"}), 400

    active_members = list(db.users.find({"_id": {"$in": list(member_oids)}, "status": {"$ne": "deactivated"}}))
    if len(active_members) < 2:
        return jsonify({"message": "Select valid group members"}), 400

    now = _utcnow()
    doc = {
        "type": "group",
        "name": name,
        "members": [member["_id"] for member in active_members],
        "createdBy": user_oid,
        "createdAt": now,
        "updatedAt": now,
    }
    db.conversations.insert_one(doc)
    payload = {
        "type": "group",
        "group": _map_group(doc, active_members),
        "lastMessage": None,
        "unreadCount": 0,
    }
    return jsonify({"success": True, "data": payload}), 201

