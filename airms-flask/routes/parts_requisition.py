from flask import Blueprint, jsonify, request

from services.mongo import get_db
from utils.mongo_helpers import parse_object_id, to_jsonable

blueprint = Blueprint("parts_requisition", __name__)


def _col():
    return get_db()["parts_requisitions"]


@blueprint.get("/get-all-requisition")
def get_all_requisitions():
    return jsonify(to_jsonable(list(_col().find().sort("_id", -1))))


@blueprint.get("/summary")
def summary():
    total = _col().count_documents({})
    pending = _col().count_documents({"status": {"$in": ["pending", "open"]}})
    approved = _col().count_documents({"status": "approved"})
    return jsonify({"total": total, "pending": pending, "approved": approved})


@blueprint.get("/get-requisition-by-id/<id>")
def get_by_id(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400
    doc = _col().find_one({"_id": oid})
    if not doc:
        return jsonify({"message": "Not found"}), 404
    return jsonify(to_jsonable(doc))


@blueprint.post("/create-requisition")
def create_requisition():
    body = request.get_json(silent=True) or {}
    result = _col().insert_one(body)
    body["_id"] = result.inserted_id
    return jsonify(to_jsonable(body)), 201


@blueprint.put("/update-requisition/<id>")
@blueprint.post("/update-requisition/<id>")
def update_requisition(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400
    updates = request.get_json(silent=True) or {}
    res = _col().update_one({"_id": oid}, {"$set": updates})
    if not res.matched_count:
        return jsonify({"message": "Not found"}), 404
    return jsonify({"message": "Updated"})
