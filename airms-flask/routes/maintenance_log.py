from datetime import datetime

from flask import Blueprint, jsonify, request

from services.mongo import get_db
from utils.mongo_helpers import parse_object_id, to_jsonable

blueprint = Blueprint("maintenance_log", __name__)


def _col():
    return get_db()["maintenance_logs"]


@blueprint.get("/getAllMaintenanceLog")
def list_items():
    return jsonify({"success": True, "data": to_jsonable(list(_col().find().sort("_id", -1)))})


@blueprint.get("/getMaintenanceLogById/<id>")
def get_item(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400
    doc = _col().find_one({"_id": oid})
    if not doc:
        return jsonify({"message": "Not found"}), 404
    return jsonify({"success": True, "data": to_jsonable(doc)})


@blueprint.post("")
@blueprint.post("/")
def create_item():
    body = request.get_json(silent=True) or {}
    body.setdefault("createdAt", datetime.utcnow())
    body["updatedAt"] = datetime.utcnow()
    result = _col().insert_one(body)
    body["_id"] = result.inserted_id
    return jsonify({"success": True, "data": to_jsonable(body)}), 201


@blueprint.put("/<id>")
def update_item(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400
    body = request.get_json(silent=True) or {}
    body["updatedAt"] = datetime.utcnow()
    res = _col().update_one({"_id": oid}, {"$set": body})
    if not res.matched_count:
        return jsonify({"message": "Not found"}), 404
    doc = _col().find_one({"_id": oid})
    return jsonify({"success": True, "message": "Updated", "data": to_jsonable(doc)})


@blueprint.delete("/<id>")
def delete_item(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400
    res = _col().delete_one({"_id": oid})
    if not res.deleted_count:
        return jsonify({"message": "Not found"}), 404
    return jsonify({"message": "Deleted"})
