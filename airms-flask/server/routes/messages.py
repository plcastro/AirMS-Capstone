from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from bson import ObjectId
try:
    from db import get_db
except ImportError:
    import sys
    from pathlib import Path
    sys.path.append(str(Path(__file__).resolve().parents[1]))
    from db import get_db

msg_bp = Blueprint("messages_api", __name__, url_prefix="/api/messages")


def _utcnow():
    return datetime.now(timezone.utc)


def _ser(d):
    x = dict(d)
    x["_id"] = str(x.get("_id"))
    for key, value in list(x.items()):
        if isinstance(value, datetime):
            x[key] = value.isoformat()
        elif isinstance(value, ObjectId):
            x[key] = str(value)
    return x


@msg_bp.get('/users')
def users():
    try:
        db = get_db()
        rows = list(db.users.find({}, {'firstName':1,'lastName':1,'username':1,'image':1,'jobTitle':1}))
        return jsonify({"success": True, "data": [_ser(r) for r in rows]})
    except Exception as exc:
        return jsonify({"success": True, "data": [], "message": f"Messages users fallback: {str(exc)}"})


@msg_bp.get('/conversations')
def conversations():
    try:
        db = get_db()
        rows = list(db.conversations.find({}).sort('updatedAt', -1))
        return jsonify({"success": True, "data": [_ser(r) for r in rows]})
    except Exception as exc:
        return jsonify({"success": True, "data": [], "message": f"Conversations fallback: {str(exc)}"})


@msg_bp.get('/<otherUserId>')
def thread(otherUserId):
    try:
        db = get_db()
        rows = list(db.messages.find({'conversationId': otherUserId}).sort('createdAt', 1))
        return jsonify({"success": True, "data": [_ser(r) for r in rows]})
    except Exception as exc:
        return jsonify({"success": True, "data": [], "message": f"Thread fallback: {str(exc)}"})


@msg_bp.post('')
def send_message():
    try:
        db = get_db()
        p = request.get_json(silent=True) or {}
        p.setdefault('createdAt', _utcnow())
        p.setdefault('updatedAt', _utcnow())
        res = db.messages.insert_one(p)
        row = db.messages.find_one({'_id': res.inserted_id})
        return jsonify({"success": True, "data": _ser(row)})
    except Exception as exc:
        return jsonify({"success": False, "message": f"Failed to send message: {str(exc)}"}), 500


@msg_bp.post('/groups')
def create_group():
    try:
        db = get_db()
        p = request.get_json(silent=True) or {}
        p.setdefault('type', 'group')
        p.setdefault('createdAt', _utcnow())
        p.setdefault('updatedAt', _utcnow())
        res = db.conversations.insert_one(p)
        row = db.conversations.find_one({'_id': res.inserted_id})
        return jsonify({"success": True, "data": _ser(row)})
    except Exception as exc:
        return jsonify({"success": False, "message": f"Failed to create group: {str(exc)}"}), 500


