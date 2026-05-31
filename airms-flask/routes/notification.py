from datetime import datetime

from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from services.mongo import get_db
from utils.mongo_helpers import parse_object_id, to_jsonable

blueprint = Blueprint("notification", __name__)


def _col():
    return get_db()["notifications"]


@blueprint.get("/")
@jwt_required()
def get_notifications():
    user_id = get_jwt_identity()
    docs = list(_col().find({"userId": user_id}).sort("_id", -1))
    return jsonify(to_jsonable(docs))

@blueprint.get("")
@jwt_required()
def get_notifications_no_slash():
    return get_notifications()


@blueprint.post("/mark-all-read")
@jwt_required()
def mark_all_read():
    user_id = get_jwt_identity()
    res = _col().update_many({"userId": user_id, "read": {"$ne": True}}, {"$set": {"read": True, "readAt": datetime.utcnow()}})
    return jsonify({"message": "Updated", "count": res.modified_count})

@blueprint.post("mark-all-read")
@jwt_required()
def mark_all_read_no_slash():
    return mark_all_read()


@blueprint.post("/<id>/read")
@jwt_required()
def mark_read(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400
    res = _col().update_one({"_id": oid}, {"$set": {"read": True, "readAt": datetime.utcnow()}})
    if not res.matched_count:
        return jsonify({"message": "Not found"}), 404
    return jsonify({"message": "Marked read"})
