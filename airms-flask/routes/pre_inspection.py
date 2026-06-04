from datetime import datetime

from flask import Blueprint, jsonify, request

from services.mongo import get_db
from utils.mongo_helpers import parse_object_id, to_jsonable

blueprint = Blueprint("pre_inspection", __name__)


def _col():
    return get_db()["pre_inspections"]


def _payload():
    body = request.get_json(silent=True) or {}
    body.pop("confirmAction", None)
    body["updatedAt"] = datetime.utcnow()
    return body


@blueprint.post("")
@blueprint.post("/")
def create_item():
    body = _payload()
    body.setdefault("status", "pending")
    body.setdefault("createdAt", datetime.utcnow())
    result = _col().insert_one(body)
    body["_id"] = result.inserted_id
    return jsonify({"success": True, "data": to_jsonable(body)}), 201


@blueprint.get("/getAllPreInspection")
def list_items():
    return jsonify({"success": True, "data": to_jsonable(list(_col().find().sort("_id", -1)))})


@blueprint.get("/getPreInspectionById/<id>")
def get_item(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400
    doc = _col().find_one({"_id": oid})
    if not doc:
        return jsonify({"message": "Not found"}), 404
    return jsonify({"success": True, "data": to_jsonable(doc)})


@blueprint.put("/<id>")
def update_item(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400
    body = _payload()
    if isinstance(body.get("releasedBy"), dict) and body["releasedBy"].get("signature") and not body["releasedBy"].get("timestamp"):
        body["releasedBy"]["timestamp"] = datetime.utcnow().isoformat()
    if isinstance(body.get("acceptedBy"), dict) and body["acceptedBy"].get("signature") and not body["acceptedBy"].get("timestamp"):
        body["acceptedBy"]["timestamp"] = datetime.utcnow().isoformat()
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


@blueprint.post("/createPreInspection")
def create_item_legacy():
    return create_item()


@blueprint.put("/updatePreInspectionById/<id>")
def update_item_legacy(id):
    return update_item(id)
