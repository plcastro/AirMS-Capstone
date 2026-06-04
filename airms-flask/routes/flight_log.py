from flask import Blueprint, jsonify, request

from services.mongo import get_db
from utils.mongo_helpers import parse_object_id, to_jsonable

blueprint = Blueprint("flight_log", __name__)


def _col():
    return get_db()["flight_logs"]


@blueprint.get("")
@blueprint.get("/")
def list_items():
    return jsonify(to_jsonable(list(_col().find().sort("_id", -1))))


@blueprint.post("")
@blueprint.post("/")
def create_item():
    body = request.get_json(silent=True) or {}
    result = _col().insert_one(body)
    body["_id"] = result.inserted_id
    return jsonify(to_jsonable(body)), 201


@blueprint.get("/stats")
def stats():
    total = _col().count_documents({})
    return jsonify({"total": total})


@blueprint.get("/search")
def search():
    query = request.args.get("q", "")
    docs = list(_col().find({"$text": {"$search": query}}).limit(50)) if query else []
    return jsonify(to_jsonable(docs))


@blueprint.get("/aircraft/<rpc>")
def by_aircraft(rpc):
    return jsonify(to_jsonable(list(_col().find({"rpc": rpc}).sort("_id", -1))))


@blueprint.get("/<id>")
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
    res = _col().update_one({"_id": oid}, {"$set": request.get_json(silent=True) or {}})
    if not res.matched_count:
        return jsonify({"message": "Not found"}), 404
    return jsonify({"message": "Updated"})


@blueprint.put("/<id>/release")
def release_item(id):
    return _set_status(id, "released")


@blueprint.put("/<id>/accept")
def accept_item(id):
    return _set_status(id, "accepted")


@blueprint.put("/<id>/complete")
def complete_item(id):
    return _set_status(id, "completed")


def _set_status(id, status):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400
    res = _col().update_one({"_id": oid}, {"$set": {"status": status}})
    if not res.matched_count:
        return jsonify({"message": "Not found"}), 404
    return jsonify({"message": f"Flight log {status}"})
