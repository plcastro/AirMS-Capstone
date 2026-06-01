from datetime import datetime, timezone
from flask import Blueprint, jsonify
from bson import ObjectId
try:
    from db import get_db
except ImportError:
    import sys
    from pathlib import Path
    sys.path.append(str(Path(__file__).resolve().parents[1]))
    from db import get_db

notif_bp = Blueprint("notifications_api", __name__, url_prefix="/api/notifications")


def _ser(d):
    x = dict(d or {})
    x["_id"] = str(x.get("_id"))
    for key, value in list(x.items()):
      if isinstance(value, datetime):
        x[key] = value.isoformat()
    return x


@notif_bp.get('')
def list_notifications():
    try:
      db = get_db()
      rows = list(db.notifications.find({}).sort('createdAt', -1).limit(100))
      return jsonify({"success": True, "data": [_ser(r) for r in rows]})
    except Exception as exc:
      return jsonify({
        "success": True,
        "data": [],
        "message": f"Notifications fallback: {str(exc)}",
      })


@notif_bp.post('/mark-all-read')
def mark_all_read():
    db = get_db()
    db.notifications.update_many({'read': {'$ne': True}}, {'$set': {'read': True}})
    return jsonify({"success": True, "message": "All notifications marked as read"})


@notif_bp.post('/<id>/read')
def mark_read(id):
    db = get_db()
    try:
      oid = ObjectId(id)
      db.notifications.update_one({'_id': oid}, {'$set': {'read': True}})
    except Exception:
      db.notifications.update_one({'id': id}, {'$set': {'read': True}})
    return jsonify({"success": True, "message": "Notification marked as read"})


