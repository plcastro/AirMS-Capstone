from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from bson import ObjectId
from pymongo import ReturnDocument

try:
    from db import get_db
except ImportError:
    import sys
    from pathlib import Path
    sys.path.append(str(Path(__file__).resolve().parents[1]))
    from db import get_db

flightlogs_bp = Blueprint("flightlogs_api", __name__, url_prefix="/api/flightlogs")


def _utcnow():
    return datetime.now(timezone.utc)


def _oid(v):
    try:
        return ObjectId(v)
    except Exception:
        return None


def _ser(d):
    x = dict(d)
    x["_id"] = str(x.get("_id"))
    for key, value in list(x.items()):
        if isinstance(value, datetime):
            x[key] = value.isoformat()
        elif isinstance(value, ObjectId):
            x[key] = str(value)
    return x


@flightlogs_bp.get("")
def list_logs():
    try:
        db = get_db()
        page = max(int(request.args.get("page", 1)), 1)
        limit = max(min(int(request.args.get("limit", 50)), 1000), 1)
        skip = (page - 1) * limit
        q = str(request.args.get("q", "")).strip()
        status = str(request.args.get("status", "")).strip()
        query = {}
        if status:
            query["status"] = {"$regex": f"^{status}$", "$options": "i"}
        if q:
            query["$or"] = [{"aircraft": {"$regex": q, "$options": "i"}}, {"pilotName": {"$regex": q, "$options": "i"}}]

        total = db.flightlogs.count_documents(query)
        rows = list(db.flightlogs.find(query).sort("date", -1).skip(skip).limit(limit))
        return jsonify({"success": True, "data": [_ser(r) for r in rows], "total": total, "page": page, "limit": limit})
    except Exception as exc:
        return jsonify({"success": True, "data": [], "total": 0, "page": 1, "limit": 500, "message": f"Flight logs fallback: {str(exc)}"})


@flightlogs_bp.get("/search")
def search_logs():
    db = get_db()
    q = str(request.args.get("q", "")).strip()
    limit = max(min(int(request.args.get("limit", 200)), 1000), 1)
    query = {"$or": [{"aircraft": {"$regex": q, "$options": "i"}}, {"pilotName": {"$regex": q, "$options": "i"}}]} if q else {}
    rows = list(db.flightlogs.find(query).sort("date", -1).limit(limit))
    return jsonify({"success": True, "data": [_ser(r) for r in rows]})


@flightlogs_bp.post("")
def create_log():
    db = get_db()
    payload = request.get_json(silent=True) or {}
    payload.setdefault("status", "Draft")
    payload.setdefault("date", _utcnow().isoformat())
    payload.setdefault("createdAt", _utcnow())
    payload.setdefault("updatedAt", _utcnow())
    res = db.flightlogs.insert_one(payload)
    row = db.flightlogs.find_one({"_id": res.inserted_id})
    return jsonify({"message": "Flight log created", "data": _ser(row)})


@flightlogs_bp.get("/<id>")
def get_log(id):
    db = get_db()
    row = db.flightlogs.find_one({"_id": _oid(id)})
    if not row:
        return jsonify({"message": "Flight log not found"}), 404
    return jsonify({"success": True, "data": _ser(row)})


@flightlogs_bp.put("/<id>")
def update_log(id):
    db = get_db()
    payload = request.get_json(silent=True) or {}
    payload["updatedAt"] = _utcnow()
    row = db.flightlogs.find_one_and_update({"_id": _oid(id)}, {"$set": payload}, return_document=ReturnDocument.AFTER)
    if not row:
        return jsonify({"message": "Flight log not found"}), 404
    return jsonify({"message": "Flight log updated", "data": _ser(row)})


@flightlogs_bp.put("/<id>/release")
def release_log(id):
    db = get_db()
    row = db.flightlogs.find_one_and_update({"_id": _oid(id)}, {"$set": {"status": "Released", "updatedAt": _utcnow()}}, return_document=ReturnDocument.AFTER)
    if not row:
        return jsonify({"message": "Flight log not found"}), 404
    return jsonify({"message": "Flight log released", "data": _ser(row)})


@flightlogs_bp.put("/<id>/accept")
def accept_log(id):
    db = get_db()
    row = db.flightlogs.find_one_and_update({"_id": _oid(id)}, {"$set": {"status": "Accepted", "updatedAt": _utcnow()}}, return_document=ReturnDocument.AFTER)
    if not row:
        return jsonify({"message": "Flight log not found"}), 404
    return jsonify({"message": "Flight log accepted", "data": _ser(row)})


@flightlogs_bp.put("/<id>/complete")
def complete_log(id):
    db = get_db()
    row = db.flightlogs.find_one_and_update({"_id": _oid(id)}, {"$set": {"status": "Completed", "completedAt": _utcnow(), "updatedAt": _utcnow()}}, return_document=ReturnDocument.AFTER)
    if not row:
        return jsonify({"message": "Flight log not found"}), 404
    return jsonify({"message": "Flight log completed", "data": _ser(row)})


