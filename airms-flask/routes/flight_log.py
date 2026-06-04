from datetime import datetime

from flask import Blueprint, jsonify, request

from services.mongo import get_db
from utils.mongo_helpers import parse_object_id, to_jsonable

blueprint = Blueprint("flight_log", __name__)
FLIGHT_LOG_COLLECTIONS = ("flight_logs", "flightlogs")


def _col():
    return get_db()["flight_logs"]


def _collections():
    db = get_db()
    return [db[name] for name in FLIGHT_LOG_COLLECTIONS]


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


def _sortable_value(doc, field):
    value = doc.get(field)
    if value not in (None, ""):
        return value
    for fallback in ("createdAt", "updatedAt", "date", "_id"):
        fallback_value = doc.get(fallback)
        if fallback_value not in (None, ""):
            return fallback_value
    return ""


def _merge_docs(docs):
    merged = {}
    for doc in docs:
        key = str(doc.get("_id") or doc.get("id") or "")
        if not key:
            continue
        merged[key] = doc
    return list(merged.values())


def _find_all(query=None):
    query = query or {}
    docs = []
    for collection in _collections():
        docs.extend(list(collection.find(query)))
    return _merge_docs(docs)


def _find_one(id_value):
    oid = parse_object_id(id_value)
    for collection in _collections():
        if oid:
            doc = collection.find_one({"_id": oid})
            if doc:
                return doc, collection
        doc = collection.find_one({"id": str(id_value)})
        if doc:
            return doc, collection
    return None, None


def _sort_docs(docs, sort_by="date", sort_order="desc"):
    reverse = str(sort_order or "desc").lower() != "asc"

    def _key(doc):
        value = _sortable_value(doc, sort_by)
        if isinstance(value, datetime):
            return (0, value.timestamp())
        if isinstance(value, (int, float)):
            return (1, float(value))
        return (2, str(value or ""))

    return sorted(docs, key=_key, reverse=reverse)


def _paged_response(docs, total, page, limit):
    pages = max(1, (total + limit - 1) // limit)
    return jsonify({"success": True, "data": to_jsonable(docs), "pagination": {"page": page, "limit": limit, "total": total, "pages": pages}})


@blueprint.get("")
@blueprint.get("/")
def list_items():
    page = max(int(request.args.get("page") or 1), 1)
    limit = min(max(int(request.args.get("limit") or 500), 1), 1000)
    query = _filter_query()
    sort_by = request.args.get("sortBy") or "date"
    sort_order = request.args.get("sortOrder") or "desc"
    docs = _sort_docs(_find_all(query), sort_by=sort_by, sort_order=sort_order)
    total = len(docs)
    docs = docs[(page - 1) * limit : (page - 1) * limit + limit]
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
        docs = _sort_docs(
            _find_all({"$or": [{"rpc": regex}, {"aircraftType": regex}, {"date": regex}, {"controlNo": regex}]}),
            sort_by="date",
            sort_order="desc",
        )[:limit]
    else:
        docs = []
    return jsonify({"success": True, "data": to_jsonable(docs)})


@blueprint.get("/aircraft/<rpc>")
def by_aircraft(rpc):
    return jsonify({"success": True, "data": to_jsonable(_sort_docs(_find_all({"rpc": rpc}), sort_by="date", sort_order="desc"))})


@blueprint.get("/<id>")
def get_item(id):
    if not parse_object_id(id):
        return jsonify({"message": "Invalid id"}), 400
    doc, _ = _find_one(id)
    if not doc:
        return jsonify({"message": "Not found"}), 404
    return jsonify({"success": True, "data": to_jsonable(doc)})


@blueprint.put("/<id>")
def update_item(id):
    if not parse_object_id(id):
        return jsonify({"message": "Invalid id"}), 400
    doc, collection = _find_one(id)
    if not doc or collection is None:
        return jsonify({"message": "Not found"}), 404
    body = request.get_json(silent=True) or {}
    body["updatedAt"] = datetime.utcnow()
    res = collection.update_one({"_id": doc["_id"]}, {"$set": body})
    if not res.matched_count:
        return jsonify({"message": "Not found"}), 404
    doc = collection.find_one({"_id": doc["_id"]})
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
    if not parse_object_id(id):
        return jsonify({"message": "Invalid id"}), 400
    doc, collection = _find_one(id)
    if not doc or collection is None:
        return jsonify({"message": "Not found"}), 404
    body = request.get_json(silent=True) or {}
    updates = {"status": status, "updatedAt": datetime.utcnow()}
    if status == "released":
        updates["releasedBy"] = {"name": body.get("name") or body.get("releasedBy", {}).get("name"), "signature": body.get("signature"), "timestamp": datetime.utcnow().isoformat()}
        updates["status"] = "pending_acceptance"
    if status == "accepted":
        updates["acceptedBy"] = {"name": body.get("name") or body.get("acceptedBy", {}).get("name"), "signature": body.get("signature"), "timestamp": datetime.utcnow().isoformat()}
    if status == "completed":
        updates["completedAt"] = datetime.utcnow()
    res = collection.update_one({"_id": doc["_id"]}, {"$set": updates})
    if not res.matched_count:
        return jsonify({"message": "Not found"}), 404
    doc = collection.find_one({"_id": doc["_id"]})
    return jsonify({"success": True, "message": f"Flight log {status}", "data": to_jsonable(doc)})
