from datetime import datetime

from flask import Blueprint, jsonify, request

from services.mongo import get_db
from utils.mongo_helpers import parse_object_id, to_jsonable

blueprint = Blueprint("flight_log", __name__)


def _col():
    return get_db()["flight_logs"]


def _normalize_status(value=""):
    status = str(value or "").strip().lower().replace("-", "_").replace(" ", "_")
    if status in {"ongoing", "draft"}:
        return "pending_release"
    if status == "released":
        return "pending_acceptance"
    return status or "pending_release"


def _filter_query():
    query = {}
    aircraft = request.args.get("aircraftRPC") or request.args.get("rpc")
    status = request.args.get("status")
    if aircraft and aircraft != "all":
        query["rpc"] = aircraft
    if status and status != "all":
        normalized = _normalize_status(status)
        if normalized == "pending_acceptance":
            query["status"] = {"$in": ["pending_acceptance", "released"]}
        elif normalized == "pending_release":
            query["status"] = {"$in": ["pending_release", "ongoing", "draft", None, ""]}
        else:
            query["status"] = normalized
    return query


def _paged_response(docs, total, page, limit):
    pages = max(1, (total + limit - 1) // limit)
    return jsonify({"success": True, "data": to_jsonable(docs), "pagination": {"page": page, "limit": limit, "total": total, "pages": pages}})


@blueprint.get("")
@blueprint.get("/")
def list_items():
    page = max(int(request.args.get("page") or 1), 1)
    limit = min(max(int(request.args.get("limit") or 500), 1), 1000)
    query = _filter_query()
    total = _col().count_documents(query)
    docs = list(_col().find(query).sort("_id", -1).skip((page - 1) * limit).limit(limit))
    return _paged_response(docs, total, page, limit)


@blueprint.post("")
@blueprint.post("/")
def create_item():
    body = request.get_json(silent=True) or {}
    body.setdefault("status", "pending_release")
    body.setdefault("createdAt", datetime.utcnow())
    body.setdefault("updatedAt", datetime.utcnow())
    result = _col().insert_one(body)
    body["_id"] = result.inserted_id
    return jsonify({"success": True, "data": to_jsonable(body)}), 201


@blueprint.get("/stats")
def stats():
    total = _col().count_documents({})
    return jsonify({"total": total})


@blueprint.get("/search")
def search():
    query = request.args.get("q", "")
    limit = min(max(int(request.args.get("limit") or 500), 1), 1000)
    if query:
        regex = {"$regex": query, "$options": "i"}
        docs = list(_col().find({"$or": [{"rpc": regex}, {"aircraftType": regex}, {"date": regex}, {"controlNo": regex}]}).sort("_id", -1).limit(limit))
    else:
        docs = []
    return jsonify({"success": True, "data": to_jsonable(docs)})


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
    return jsonify({"success": True, "data": to_jsonable(doc)})


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
    body = request.get_json(silent=True) or {}
    updates = {"status": status, "updatedAt": datetime.utcnow()}
    if status == "released":
        updates["releasedBy"] = {"name": body.get("name") or body.get("releasedBy", {}).get("name"), "signature": body.get("signature"), "timestamp": datetime.utcnow().isoformat()}
        updates["status"] = "pending_acceptance"
    if status == "accepted":
        updates["acceptedBy"] = {"name": body.get("name") or body.get("acceptedBy", {}).get("name"), "signature": body.get("signature"), "timestamp": datetime.utcnow().isoformat()}
    if status == "completed":
        updates["completedAt"] = datetime.utcnow()
    res = _col().update_one({"_id": oid}, {"$set": updates})
    if not res.matched_count:
        return jsonify({"message": "Not found"}), 404
    doc = _col().find_one({"_id": oid})
    return jsonify({"success": True, "message": f"Flight log {status}", "data": to_jsonable(doc)})
