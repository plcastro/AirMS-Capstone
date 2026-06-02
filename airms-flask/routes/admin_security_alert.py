from datetime import datetime

from flask import Blueprint, jsonify

from services.mongo import get_db
from utils.mongo_helpers import parse_object_id, to_jsonable

blueprint = Blueprint("admin_security_alert", __name__)


def _col():
    return get_db()["admin_security_alerts"]


@blueprint.get("/")
def get_alerts():
    docs = list(_col().find().sort("_id", -1))
    return jsonify(to_jsonable(docs))


@blueprint.get("/summary")
def summary():
    total = _col().count_documents({})
    unread = _col().count_documents({"read": {"$ne": True}})
    return jsonify({"total": total, "unread": unread})


@blueprint.get("/unread")
def unread():
    docs = list(_col().find({"read": {"$ne": True}}).sort("_id", -1))
    return jsonify(to_jsonable(docs))


@blueprint.put("/<id>/read")
def mark_read(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400
    res = _col().update_one({"_id": oid}, {"$set": {"read": True, "readAt": datetime.utcnow()}})
    if not res.matched_count:
        return jsonify({"message": "Not found"}), 404
    return jsonify({"message": "Marked read"})


@blueprint.put("/mark-all-read")
def mark_all():
    res = _col().update_many({"read": {"$ne": True}}, {"$set": {"read": True, "readAt": datetime.utcnow()}})
    return jsonify({"message": "Updated", "count": res.modified_count})
