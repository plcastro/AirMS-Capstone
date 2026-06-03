from flask import Blueprint, jsonify, request

from services.mongo import get_db
from utils.mongo_helpers import parse_object_id, to_jsonable

blueprint = Blueprint("task", __name__)


def _col():
    return get_db()["tasks"]


@blueprint.post("/create")
def create_task():
    body = request.get_json(silent=True) or {}
    result = _col().insert_one(body)
    body["_id"] = result.inserted_id
    return jsonify(to_jsonable(body)), 201


@blueprint.get("/getAll")
def get_tasks():
    return jsonify(to_jsonable(list(_col().find().sort("_id", -1))))


@blueprint.get("/summary")
def summary():
    total = _col().count_documents({})
    open_count = _col().count_documents({"status": {"$in": ["open", "pending", "in progress"]}})
    done_count = _col().count_documents({"status": {"$in": ["done", "completed"]}})
    return jsonify({"total": total, "open": open_count, "completed": done_count})


@blueprint.get("/analytics/base-maintenance")
def base_maintenance():
    pipeline = [
        {"$group": {"_id": {"$ifNull": ["$base", "Unknown"]}, "total": {"$sum": 1}}},
        {"$sort": {"total": -1}},
    ]
    return jsonify(to_jsonable(list(_col().aggregate(pipeline))))


@blueprint.get("/<id>")
def get_task(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400
    doc = _col().find_one({"_id": oid})
    if not doc:
        return jsonify({"message": "Task not found"}), 404
    return jsonify(to_jsonable(doc))


@blueprint.put("/<id>")
def update_task(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400
    body = request.get_json(silent=True) or {}
    result = _col().update_one({"_id": oid}, {"$set": body})
    if result.matched_count == 0:
        return jsonify({"message": "Task not found"}), 404
    return jsonify({"message": "Task updated"})


@blueprint.delete("/<id>")
def delete_task(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400
    result = _col().delete_one({"_id": oid})
    if result.deleted_count == 0:
        return jsonify({"message": "Task not found"}), 404
    return jsonify({"message": "Task deleted"})
