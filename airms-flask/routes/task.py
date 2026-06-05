from datetime import datetime, timezone

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


def _aircraft():
    return get_db()["aircraft"]


def _payload():
    body = request.get_json(silent=True) or {}
    body.pop("confirmAction", None)
    body["updatedAt"] = datetime.utcnow()
    return body


def _task_id(doc):
    return str(doc.get("id") or doc.get("_id") or "")


def _to_valid_date(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).replace(tzinfo=None) if value.tzinfo else value
    if isinstance(value, str):
        try:
            date = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return date.astimezone(timezone.utc).replace(tzinfo=None) if date.tzinfo else date
        except ValueError:
            return None
    return None


def _round_hours(value):
    return round(value, 2)


def _normalize_base_value(value):
    return str(value or "").strip().upper()


def _is_known_base(value):
    normalized = _normalize_base_value(value)
    return normalized not in {"", "UNKNOWN", "N/A", "NA", "UNASSIGNED"}


def _first_known_base(*values):
    for value in values:
        if _is_known_base(value):
            return _normalize_base_value(value)
    return ""


def _build_aircraft_base_lookup():
    lookup = {}
    for aircraft in _aircraft().find({}, {"tailNum": 1, "tailNumber": 1, "rpc": 1, "aircraft": 1, "base": 1}):
        base = aircraft.get("base")
        if not _is_known_base(base):
            continue
        for key in (aircraft.get("tailNum"), aircraft.get("tailNumber"), aircraft.get("rpc"), aircraft.get("aircraft")):
            normalized_key = _normalize_base_value(key)
            if normalized_key:
                lookup[normalized_key] = _normalize_base_value(base)
    return lookup


def _normalize_task_base(task, aircraft_base_by_tail):
    return _first_known_base(
        task.get("base"),
        task.get("locationBase"),
        task.get("assignedBase"),
        task.get("stationBase"),
        aircraft_base_by_tail.get(_normalize_base_value(task.get("aircraft"))),
    ) or "UNKNOWN"


def _get_discovered_at(task):
    history = task.get("maintenanceHistory") if isinstance(task.get("maintenanceHistory"), dict) else {}
    return _to_valid_date(history.get("defectDiscoveredAt") or task.get("dateDiscovered") or task.get("createdAt"))


def _get_rectified_at(task):
    history = task.get("maintenanceHistory") if isinstance(task.get("maintenanceHistory"), dict) else {}
    return _to_valid_date(
        history.get("defectRectifiedAt")
        or task.get("dateRectified")
        or task.get("completedAt")
        or task.get("approvedAt")
    )


def _is_damage_related(task):
    has_defect_notes = bool(str(task.get("defects") or "").strip() or str(task.get("findings") or "").strip())
    maintenance_type = str(task.get("maintenanceType") or "").lower()
    title = str(task.get("title") or "").lower()
    return has_defect_notes or "corrective" in maintenance_type or any(
        keyword in title for keyword in ("damage", "damaged", "defect", "crack", "fault", "issue")
    )


def _is_same_calendar_day(left_date, right_date):
    return left_date.date() == right_date.date()


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
    aircraft_base_by_tail = _build_aircraft_base_lookup()
    by_base = {}
    totals = {
        "damagedCount": 0,
        "repairedCount": 0,
        "sameDayRepairCount": 0,
        "rectificationHoursTotal": 0,
        "rectificationSamples": 0,
        "averageRectificationHours": 0,
    }

    for task in _col().find({}):
        base = _normalize_task_base(task, aircraft_base_by_tail)
        if base not in by_base:
            by_base[base] = {
                "base": base,
                "damagedCount": 0,
                "repairedCount": 0,
                "sameDayRepairCount": 0,
                "rectificationHoursTotal": 0,
                "rectificationSamples": 0,
                "averageRectificationHours": 0,
            }

        discovered_at = _get_discovered_at(task)
        rectified_at = _get_rectified_at(task)

        if _is_damage_related(task):
            by_base[base]["damagedCount"] += 1
            totals["damagedCount"] += 1

        if rectified_at:
            by_base[base]["repairedCount"] += 1
            totals["repairedCount"] += 1

        if discovered_at and rectified_at:
            rectification_hours = (rectified_at - discovered_at).total_seconds() / 3600
            if rectification_hours >= 0:
                by_base[base]["rectificationHoursTotal"] += rectification_hours
                by_base[base]["rectificationSamples"] += 1
                totals["rectificationHoursTotal"] += rectification_hours
                totals["rectificationSamples"] += 1

            history = task.get("maintenanceHistory") if isinstance(task.get("maintenanceHistory"), dict) else {}
            if history.get("sameDayRepair") is True or _is_same_calendar_day(discovered_at, rectified_at):
                by_base[base]["sameDayRepairCount"] += 1
                totals["sameDayRepairCount"] += 1

    base_rows = []
    for row in by_base.values():
        samples = row["rectificationSamples"]
        row["averageRectificationHours"] = _round_hours(row["rectificationHoursTotal"] / samples) if samples else 0
        base_rows.append(row)
    base_rows.sort(key=lambda row: row["damagedCount"], reverse=True)

    top_damaged_base = max(base_rows, key=lambda row: row["damagedCount"], default=None)
    top_repaired_base = max(base_rows, key=lambda row: row["repairedCount"], default=None)
    if totals["rectificationSamples"]:
        totals["averageRectificationHours"] = _round_hours(
            totals["rectificationHoursTotal"] / totals["rectificationSamples"]
        )

    return jsonify(
        to_jsonable(
            {
                "status": "Ok",
                "data": {
                    "byBase": base_rows,
                    "topDamagedBase": top_damaged_base,
                    "topRepairedBase": top_repaired_base,
                    "totals": totals,
                },
            }
        )
    )


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
