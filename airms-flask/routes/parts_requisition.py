from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from services.mongo import get_db
from utils.mongo_helpers import parse_object_id, to_jsonable

blueprint = Blueprint("parts_requisition", __name__)


def _primary_col():
    return get_db()["partsrequisitions"]


def _legacy_col():
    return get_db()["parts_requisitions"]


def _all_docs():
    primary_docs = list(_primary_col().find())
    legacy_docs = list(_legacy_col().find())
    merged = {}

    for doc in primary_docs + legacy_docs:
        merged[str(doc.get("_id"))] = doc

    return list(merged.values())


def _sort_token(doc):
    for field in ("createdAt", "updatedAt", "dateRequested"):
        value = doc.get(field)
        if isinstance(value, datetime):
            return value.timestamp()
        if isinstance(value, str) and value:
            try:
                return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
            except ValueError:
                continue
    return float(doc.get("_id").generation_time.timestamp()) if doc.get("_id") else 0.0


@blueprint.get("/get-all-requisition")
def get_all_requisitions():
    docs = sorted(_all_docs(), key=_sort_token, reverse=True)
    return jsonify(to_jsonable(docs))


@blueprint.get("/summary")
def summary():
    docs = _all_docs()
    statuses = [str(doc.get("status") or "").strip().lower() for doc in docs]
    total = len(docs)
    pending = sum(1 for status in statuses if status in {"pending", "open", "parts requested"})
    approved = sum(1 for status in statuses if status == "approved")
    return jsonify({"total": total, "pending": pending, "approved": approved})


@blueprint.get("/get-requisition-by-id/<id>")
def get_by_id(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400
    doc = _primary_col().find_one({"_id": oid}) or _legacy_col().find_one({"_id": oid})
    if not doc:
        return jsonify({"message": "Not found"}), 404
    return jsonify(to_jsonable(doc))


@blueprint.post("/create-requisition")
def create_requisition():
    body = request.get_json(silent=True) or {}
    now = datetime.now(timezone.utc)
    body.setdefault("createdAt", now)
    body.setdefault("updatedAt", now)
    result = _primary_col().insert_one(body)
    body["_id"] = result.inserted_id
    _legacy_col().replace_one({"_id": result.inserted_id}, body, upsert=True)
    return jsonify(to_jsonable(body)), 201


@blueprint.put("/update-requisition/<id>")
@blueprint.post("/update-requisition/<id>")
def update_requisition(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400
    updates = request.get_json(silent=True) or {}
    res = _primary_col().update_one({"_id": oid}, {"$set": updates})
    legacy_res = _legacy_col().update_one({"_id": oid}, {"$set": updates})
    if not res.matched_count and not legacy_res.matched_count:
        return jsonify({"message": "Not found"}), 404
    return jsonify({"message": "Updated"})
