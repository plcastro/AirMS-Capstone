from flask import Blueprint, jsonify, request

from services.mongo import get_db
from utils.mongo_helpers import parse_object_id, to_jsonable

blueprint = Blueprint("parts_monitoring", __name__)


def _col():
    return get_db()["parts_monitoring"]


@blueprint.get("")
@blueprint.get("/")
def get_all():
    return jsonify(to_jsonable(list(_col().find().sort("_id", -1))))


@blueprint.get("/aircraft-list")
def aircraft_list():
    docs = _col().distinct("aircraft")
    return jsonify(docs)


@blueprint.get("/maintenance-priority/rules")
def get_rules():
    rules = list(get_db()["maintenance_priority_rules"].find())
    return jsonify(to_jsonable(rules))


@blueprint.put("/maintenance-priority/rules")
def put_rules():
    body = request.get_json(silent=True) or {}
    get_db()["maintenance_priority_rules"].delete_many({})
    docs = body if isinstance(body, list) else [body]
    if docs:
        get_db()["maintenance_priority_rules"].insert_many(docs)
    return jsonify({"message": "Rules saved"})


@blueprint.get("/maintenance-priority")
def maintenance_priority():
    docs = list(_col().find({"priority": {"$exists": True}}).sort("priority", -1))
    return jsonify(to_jsonable(docs))


@blueprint.get("/inspection-remaining-hours")
def remaining_hours():
    docs = list(_col().find({}, {"aircraft": 1, "remainingHours": 1}))
    return jsonify(to_jsonable(docs))


@blueprint.get("/<aircraft>")
def by_aircraft(aircraft):
    docs = list(_col().find({"aircraft": aircraft}))
    return jsonify(to_jsonable(docs))


@blueprint.post("/save")
def save():
    body = request.get_json(silent=True) or {}
    result = _col().insert_one(body)
    body["_id"] = result.inserted_id
    return jsonify(to_jsonable(body)), 201


@blueprint.delete("/<id>")
def delete_by_id(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400
    res = _col().delete_one({"_id": oid})
    if not res.deleted_count:
        return jsonify({"message": "Not found"}), 404
    return jsonify({"message": "Deleted"})


@blueprint.delete("/aircraft/<aircraft>")
def delete_by_aircraft(aircraft):
    res = _col().delete_many({"aircraft": aircraft})
    return jsonify({"message": "Deleted", "count": res.deleted_count})


@blueprint.put("/<aircraft>/update-totals")
def update_totals(aircraft):
    payload = request.get_json(silent=True) or {}
    res = _col().update_many({"aircraft": aircraft}, {"$set": payload})
    return jsonify({"message": "Updated", "count": res.modified_count})
