import secrets
from datetime import datetime, timezone

from bson import ObjectId
from flask import Blueprint, jsonify, request
import jwt
from pymongo import ReturnDocument

try:
    from db import get_db
except ImportError:
    import sys
    from pathlib import Path
    sys.path.append(str(Path(__file__).resolve().parents[1]))
    from db import get_db


tasks_bp = Blueprint("tasks_api", __name__, url_prefix="/api/tasks")


def _utcnow():
    return datetime.now(timezone.utc)


def _to_oid(value):
    try:
        return ObjectId(value)
    except Exception:
        return None


def _decode_access_token():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.lower().startswith("bearer "):
        return None
    token = auth_header.split(" ", 1)[1].strip()
    try:
        return jwt.decode(token, "dev-jwt-secret", algorithms=["HS256"], options={"verify_signature": False})
    except Exception:
        return None


def _serialize(task):
    out = dict(task)
    out["_id"] = str(out.get("_id"))
    out.setdefault("id", out["_id"])
    for key, value in list(out.items()):
        if isinstance(value, datetime):
            out[key] = value.isoformat()
        elif isinstance(value, ObjectId):
            out[key] = str(value)
    return out


@tasks_bp.get("/getAll")
def get_all_tasks():
    try:
        if not _decode_access_token():
            return jsonify({"message": "Unauthorized"}), 401
        db = get_db()
        rows = list(db.tasks.find({}).sort("createdAt", -1))
        return jsonify({"status": "Ok", "data": [_serialize(r) for r in rows]})
    except Exception as exc:
        return jsonify({"status": "Ok", "data": [], "message": f"Tasks fallback: {str(exc)}"})


@tasks_bp.post("/create")
def create_task():
    user = _decode_access_token()
    if not user:
        return jsonify({"message": "Unauthorized"}), 401

    db = get_db()
    payload = request.get_json(silent=True) or {}
    now = _utcnow()

    assigned_to = payload.get("assignedTo")
    assigned_name = payload.get("assignedToName")
    if assigned_to and not assigned_name:
        u = db.users.find_one({"_id": _to_oid(str(assigned_to))})
        if u:
            assigned_name = f"{u.get('firstName','')} {u.get('lastName','')}`".strip(" `")

    checklist_items = payload.get("checklistItems") if isinstance(payload.get("checklistItems"), list) else []
    checklist_state = payload.get("checklistState") if isinstance(payload.get("checklistState"), list) else [False] * len(checklist_items)

    doc = {
        "id": secrets.token_hex(8),
        "title": payload.get("title", ""),
        "aircraft": payload.get("aircraft", ""),
        "assignedTo": assigned_to,
        "assignedToName": assigned_name or "",
        "priority": payload.get("priority", "Normal"),
        "maintenanceType": payload.get("maintenanceType", "Inspection"),
        "inspectionType": payload.get("inspectionType"),
        "checklistItems": checklist_items,
        "checklistState": checklist_state,
        "status": payload.get("status", "Pending"),
        "findings": payload.get("findings", ""),
        "createdAt": now,
        "updatedAt": now,
        "startDateTime": payload.get("startDateTime"),
        "endDateTime": payload.get("endDateTime"),
        "dueDate": payload.get("dueDate") or payload.get("endDateTime"),
        "isApproved": False,
        "approvedBy": None,
        "approvedAt": None,
        "approvedSignature": "",
        "returnComments": "",
        "createdBy": user.get("id"),
    }
    result = db.tasks.insert_one(doc)
    created = db.tasks.find_one({"_id": result.inserted_id})
    return jsonify({"message": "Task created successfully", "data": _serialize(created)})


@tasks_bp.get("/summary")
def summary_tasks():
    if not _decode_access_token():
        return jsonify({"message": "Unauthorized"}), 401
    db = get_db()
    rows = list(db.tasks.find({}, {"status": 1, "priority": 1}))
    total = len(rows)
    by_status = {}
    by_priority = {}
    for r in rows:
        status = str(r.get("status", "Unknown")).strip().lower()
        pr = str(r.get("priority", "Normal")).strip().lower()
        by_status[status] = by_status.get(status, 0) + 1
        by_priority[pr] = by_priority.get(pr, 0) + 1
    return jsonify({"status": "Ok", "data": {"total": total, "byStatus": by_status, "byPriority": by_priority}})


@tasks_bp.get("/analytics/base-maintenance")
def base_analytics():
    if not _decode_access_token():
        return jsonify({"message": "Unauthorized"}), 401
    db = get_db()
    pipeline = [
        {"$group": {"_id": "$aircraft", "count": {"$sum": 1}}},
        {"$project": {"_id": 0, "aircraft": "$_id", "count": 1}},
    ]
    data = list(db.tasks.aggregate(pipeline))
    return jsonify({"status": "Ok", "data": data})


@tasks_bp.get("/<id>")
def get_task_by_id(id):
    if not _decode_access_token():
        return jsonify({"message": "Unauthorized"}), 401
    db = get_db()
    row = db.tasks.find_one({"$or": [{"_id": _to_oid(id)}, {"id": id}]})
    if not row:
        return jsonify({"message": "Task not found"}), 404
    return jsonify({"status": "Ok", "data": _serialize(row)})


@tasks_bp.put("/<id>")
def update_task(id):
    if not _decode_access_token():
        return jsonify({"message": "Unauthorized"}), 401
    db = get_db()
    payload = request.get_json(silent=True) or {}
    payload.pop("_id", None)
    payload.pop("id", None)
    payload["updatedAt"] = _utcnow()

    row = db.tasks.find_one_and_update(
        {"$or": [{"_id": _to_oid(id)}, {"id": id}]},
        {"$set": payload},
        return_document=ReturnDocument.AFTER,
    )
    if not row:
        return jsonify({"message": "Task not found"}), 404
    return jsonify({"message": "Task updated successfully", "data": _serialize(row)})


@tasks_bp.delete("/<id>")
def delete_task(id):
    if not _decode_access_token():
        return jsonify({"message": "Unauthorized"}), 401
    db = get_db()
    result = db.tasks.delete_one({"$or": [{"_id": _to_oid(id)}, {"id": id}]})
    if result.deleted_count == 0:
        return jsonify({"message": "Task not found"}), 404
    return jsonify({"message": "Task deleted successfully"})


