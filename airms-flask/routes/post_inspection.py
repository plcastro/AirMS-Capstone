from flask import Blueprint, jsonify, request

from services.mongo import get_db
from utils.mongo_helpers import parse_object_id, to_jsonable

blueprint = Blueprint("post_inspection", __name__)


def _col():
    return get_db()["post_inspections"]


@blueprint.post("/")
def create_item():
    body = request.get_json(silent=True) or {}
    result = _col().insert_one(body)
    body["_id"] = result.inserted_id
    return jsonify(to_jsonable(body)), 201


@blueprint.get("/getAllPostInspection")
def list_items():
    return jsonify(to_jsonable(list(_col().find().sort("_id", -1))))


@blueprint.get("/getPostInspectionById/<id>")
def get_item(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400
    doc = _col().find_one({"_id": oid})
    if not doc:
        return jsonify({"message": "Not found"}), 404
    return jsonify(to_jsonable(doc))


@blueprint.put("/<id>")
def update_item(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400
    body = request.get_json(silent=True) or {}
    res = _col().update_one({"_id": oid}, {"$set": body})
    if not res.matched_count:
        return jsonify({"message": "Not found"}), 404
    return jsonify({"message": "Updated"})


@blueprint.delete("/<id>")
def delete_item(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400
    res = _col().delete_one({"_id": oid})
    if not res.deleted_count:
        return jsonify({"message": "Not found"}), 404
    return jsonify({"message": "Deleted"})
