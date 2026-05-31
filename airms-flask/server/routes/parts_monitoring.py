from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from pymongo import ReturnDocument

try:
    from db import get_db
except ImportError:
    import sys
    from pathlib import Path
    sys.path.append(str(Path(__file__).resolve().parents[1]))
    from db import get_db

parts_bp = Blueprint("parts_monitoring_api", __name__, url_prefix="/api/parts-monitoring")

DEFAULT_RULES = {
    "criticalDueDays": 5,
    "criticalRemainingHours": 14,
    "highDueDays": 7,
    "highRemainingHours": 24,
    "mediumDueDays": 14,
    "longTurnaroundHours": 5,
}


def _utcnow():
    return datetime.now(timezone.utc)


@parts_bp.get("/aircraft-list")
def aircraft_list():
    db = get_db()
    from_parts = db.partslifespanmonitorings.distinct("aircraft")
    from_aircraft = db.aircrafts.distinct("rpc") if "aircrafts" in db.list_collection_names() else []
    values = sorted({str(v).strip() for v in [*from_parts, *from_aircraft] if str(v).strip()})
    return jsonify({"success": True, "data": values})


@parts_bp.post("/save")
def save_parts_monitoring():
    db = get_db()
    payload = request.get_json(silent=True) or {}
    aircraft = str(payload.get("aircraft", "")).strip()
    if not aircraft:
        return jsonify({"success": False, "message": "Aircraft is required"}), 400

    doc = {
        "aircraft": aircraft,
        "referenceData": payload.get("referenceData") or {},
        "parts": payload.get("parts") or [],
        "updatedBy": payload.get("updatedBy") or "user",
        "updatedAt": _utcnow(),
    }

    updated = db.partslifespanmonitorings.find_one_and_update(
        {"aircraft": aircraft},
        {"$set": doc},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return jsonify({"success": True, "message": "Saved", "data": updated})


@parts_bp.get("")
def get_all_parts_monitoring():
    db = get_db()
    page = max(int(request.args.get("page", 1)), 1)
    limit = max(min(int(request.args.get("limit", 50)), 1000), 1)
    skip = (page - 1) * limit

    rows = list(db.partslifespanmonitorings.find({}).skip(skip).limit(limit))
    for r in rows:
        r["_id"] = str(r.get("_id"))
    return jsonify({"success": True, "data": rows, "page": page, "limit": limit})


@parts_bp.get("/maintenance-priority/rules")
def get_priority_rules():
    db = get_db()
    row = db.maintenancepriorityrules.find_one({}) or {}
    data = {**DEFAULT_RULES, **(row.get("rules") or row.get("value") or {})}
    return jsonify({"success": True, "data": data})


@parts_bp.put("/maintenance-priority/rules")
def update_priority_rules():
    db = get_db()
    payload = request.get_json(silent=True) or {}
    data = {**DEFAULT_RULES, **payload}
    db.maintenancepriorityrules.update_one({}, {"$set": {"rules": data, "updatedAt": _utcnow()}}, upsert=True)
    return jsonify({"success": True, "data": data, "message": "Rules updated"})


@parts_bp.get("/maintenance-priority")
def maintenance_priority():
    db = get_db()
    stored = db.maintenancepriorityrules.find_one({}) or {}
    rules = {**DEFAULT_RULES, **(stored.get("rules") or stored.get("value") or {})}

    def _as_num(name):
        raw = request.args.get(name)
        if raw is None:
            return rules[name]
        try:
            return float(raw)
        except Exception:
            return rules[name]

    active_rules = {
        "criticalDueDays": _as_num("criticalDueDays"),
        "criticalRemainingHours": _as_num("criticalRemainingHours"),
        "highDueDays": _as_num("highDueDays"),
        "highRemainingHours": _as_num("highRemainingHours"),
        "mediumDueDays": _as_num("mediumDueDays"),
        "longTurnaroundHours": _as_num("longTurnaroundHours"),
    }

    rows = list(db.partslifespanmonitorings.find({}))
    data = []
    rank = 1
    for row in rows:
        aircraft = row.get("aircraft")
        ref = row.get("referenceData") or {}
        due_days = ref.get("daysRemaining")
        due_hours = ref.get("remainingHours")

        try:
            due_days_n = float(due_days) if due_days is not None else None
        except Exception:
            due_days_n = None
        try:
            due_hours_n = float(due_hours) if due_hours is not None else None
        except Exception:
            due_hours_n = None

        level = "Low"
        triggers = []
        if (due_days_n is not None and due_days_n <= active_rules["criticalDueDays"]) or (
            due_hours_n is not None and due_hours_n <= active_rules["criticalRemainingHours"]
        ):
            level = "Critical"
            triggers.append("critical-threshold")
        elif (due_days_n is not None and due_days_n <= active_rules["highDueDays"]) or (
            due_hours_n is not None and due_hours_n <= active_rules["highRemainingHours"]
        ):
            level = "High"
            triggers.append("high-threshold")
        elif due_days_n is not None and due_days_n <= active_rules["mediumDueDays"]:
            level = "Medium"
            triggers.append("medium-threshold")

        turnaround = 4 if level in {"Critical", "High"} else 8
        data.append(
            {
                "rank": rank,
                "aircraft": aircraft,
                "aircraftModel": row.get("aircraftType") or "AS350B3",
                "nextInspection": row.get("nextInspection") or "Scheduled Inspection",
                "dueByHours": due_hours_n,
                "dueByDays": due_days_n,
                "dueDate": row.get("dueDate"),
                "dueBasis": "hours-and-calendar",
                "estimatedTurnaroundHours": turnaround,
                "usedHistoricalEstimate": False,
                "priorityLevel": level,
                "priorityReason": f"Threshold-based ranking ({level})",
                "priorityTriggers": triggers,
                "sourceRow": "parts-monitoring",
                "inspectionKey": f"{aircraft}-default",
            }
        )
        rank += 1

    order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    data.sort(key=lambda x: (order.get(x["priorityLevel"], 99), x.get("dueByDays") if x.get("dueByDays") is not None else 999999))
    for i, row in enumerate(data, 1):
        row["rank"] = i

    meta = {
        "tieBreakHours": 10,
        "tieBreakDays": 3,
        "tieBreakUrgencyRatio": 0.15,
        "rules": active_rules,
    }
    return jsonify({"success": True, "data": data, "meta": meta})


@parts_bp.get("/inspection-remaining-hours")
def inspection_remaining_hours():
    db = get_db()
    rows = list(db.partslifespanmonitorings.find({}, {"aircraft": 1, "referenceData": 1}))
    data = []
    for r in rows:
        ref = r.get("referenceData") or {}
        data.append({
            "aircraft": r.get("aircraft"),
            "remainingHours": ref.get("remainingHours"),
            "remainingDays": ref.get("daysRemaining"),
        })
    return jsonify({"success": True, "data": data})


@parts_bp.get("/<aircraft>")
def get_parts_monitoring(aircraft):
    db = get_db()
    row = db.partslifespanmonitorings.find_one({"aircraft": aircraft})
    if not row:
        return jsonify({"success": False, "message": "No saved data for aircraft"}), 404
    row["_id"] = str(row.get("_id"))
    return jsonify({"success": True, "data": row})


@parts_bp.put("/<aircraft>/update-totals")
def update_totals(aircraft):
    db = get_db()
    payload = request.get_json(silent=True) or {}
    ref_updates = payload.get("referenceData") or {}
    row = db.partslifespanmonitorings.find_one_and_update(
        {"aircraft": aircraft},
        {"$set": {"referenceData": ref_updates, "updatedAt": _utcnow()}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    row["_id"] = str(row.get("_id"))
    return jsonify({"success": True, "message": "Totals updated", "data": row})


