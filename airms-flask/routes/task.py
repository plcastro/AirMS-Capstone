from datetime import datetime

from flask import Blueprint, jsonify, request

from services.mongo import get_db
from utils.mongo_helpers import parse_object_id, to_jsonable

blueprint = Blueprint("task", __name__)


def _col():
    return get_db()["tasks"]


def _maintenance_logs():
    return get_db()["maintenance_logs"]


def _legacy_maintenance_logs():
    return get_db()["maintenancelogs"]


def _payload():
    body = request.get_json(silent=True) or {}
    body.pop("confirmAction", None)
    body["updatedAt"] = datetime.utcnow()
    return body


def _task_id(doc):
    return str(doc.get("id") or doc.get("_id") or "")


def _sync_maintenance_log(task):
    status = str(task.get("status") or "").strip().lower()
    if not (task.get("isApproved") or status == "approved"):
        return
    source_id = _task_id(task)
    if not source_id:
        return
    checklist_items = task.get("checklistItems") if isinstance(task.get("checklistItems"), list) else []
    findings = str(task.get("findings") or task.get("returnComments") or "").strip()
    work_details = []
    for index, item in enumerate(checklist_items):
        if not isinstance(item, dict):
            continue
        description = item.get("correctiveAction") or item.get("description") or item.get("documentation") or item.get("taskName")
        if description:
            work_details.append({"description": f"{index + 1}. {description}"})
    if findings:
        work_details.append({"description": f"Findings: {findings}"})
    doc = {
        "sourceTaskId": source_id,
        "taskTitle": task.get("title"),
        "aircraft": task.get("aircraft"),
        "reportedBy": task.get("assignedToName"),
        "sourceTaskStatus": task.get("status"),
        "status": "completed",
        "defects": findings,
        "correctiveActionDone": findings or task.get("title"),
        "dateDefectRectified": task.get("approvedAt") or task.get("completedAt") or datetime.utcnow(),
        "workDetails": work_details or [{"description": task.get("title") or "Maintenance task completed"}],
        "updatedAt": datetime.utcnow(),
    }
    for collection in (_maintenance_logs(), _legacy_maintenance_logs()):
        collection.update_one(
            {"sourceTaskId": source_id},
            {"$set": doc, "$setOnInsert": {"createdAt": datetime.utcnow()}},
            upsert=True,
        )


@blueprint.post("/create")
def create_task():
    body = _payload()
    body.setdefault("id", str(datetime.utcnow().timestamp()).replace(".", ""))
    body.setdefault("status", "Pending")
    body.setdefault("createdAt", datetime.utcnow())
    result = _col().insert_one(body)
    body["_id"] = result.inserted_id
    return jsonify({"success": True, "data": to_jsonable(body)}), 201


@blueprint.get("/getAll")
def get_tasks():
    return jsonify({"success": True, "data": to_jsonable(list(_col().find().sort("_id", -1)))})


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
    return jsonify({"success": True, "data": to_jsonable(doc)})


@blueprint.put("/<id>")
def update_task(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400
    body = _payload()
    result = _col().update_one({"_id": oid}, {"$set": body})
    if result.matched_count == 0:
        return jsonify({"message": "Task not found"}), 404
    doc = _col().find_one({"_id": oid})
    _sync_maintenance_log(doc)
    return jsonify({"success": True, "message": "Task updated", "data": to_jsonable(doc)})


@blueprint.delete("/<id>")
def delete_task(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400
    result = _col().delete_one({"_id": oid})
    if result.deleted_count == 0:
        return jsonify({"message": "Task not found"}), 404
    return jsonify({"message": "Task deleted"})
