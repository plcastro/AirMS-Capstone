from datetime import datetime, timezone
import os

from flask import Blueprint, jsonify, request

from services.mongo import get_db
from utils.mongo_helpers import to_jsonable
from routes.parts_monitoring import _inspection_rows, _rules_from_request

blueprint = Blueprint("ai_insights", __name__)


def _utcnow():
    return datetime.now(timezone.utc)


def _health_payload():
    configured = bool(os.getenv("OPENAI_API_KEY"))
    model = os.getenv("OPENAI_MODEL", "rule-based")
    return {
        "configured": configured,
        "reachable": configured,
        "model": model,
        "message": (
            "OpenAI not configured; rule-based maintenance insights are active."
            if not configured
            else "OpenAI is configured, but this Flask build currently uses rule-based maintenance insights."
        ),
        "cooldown": {
            "active": False,
            "retryAfterSeconds": 0,
            "message": "",
            "cooldownUntil": "",
        },
        "lastResult": {
            "message": "Rule-based insights generated from Mongo data.",
            "source": "flask-rule-engine",
        },
    }


def _task_rows_for_aircraft(aircraft):
    rows = []
    for task in get_db()["tasks"].find({"aircraft": aircraft}).sort([("dueDate", 1), ("endDateTime", 1), ("_id", -1)]):
        rows.append(
            {
                "id": str(task.get("id") or task.get("_id") or ""),
                "title": task.get("title") or task.get("summary", {}).get("title") or task.get("summary", {}).get("category") or "Untitled task",
                "status": task.get("status"),
                "priority": task.get("priority") or "Normal",
                "maintenanceType": task.get("maintenanceType") or "Maintenance",
                "assignedToName": task.get("assignedToName") or task.get("assignedTo") or "Unassigned",
                "checklistCount": len(task.get("checklistItems") or []) if isinstance(task.get("checklistItems"), list) else 0,
                "startDateTime": task.get("startDateTime") or task.get("createdAt"),
                "endDateTime": task.get("endDateTime") or task.get("dueDate"),
                "dueDate": task.get("dueDate"),
            }
        )
    return rows


def _risk_level(remaining_hours, remaining_days):
    if remaining_hours is not None and remaining_hours <= 0:
        return "Critical"
    if remaining_days is not None and remaining_days <= 0:
        return "Critical"
    if remaining_hours is not None and remaining_hours <= 24:
        return "High"
    if remaining_days is not None and remaining_days <= 7:
        return "High"
    if remaining_hours is not None and remaining_hours <= 72:
        return "Medium"
    if remaining_days is not None and remaining_days <= 14:
        return "Medium"
    return "Low"


def _build_insight(aircraft, inspection_rows, rules):
    if not inspection_rows:
        return None

    ranked_rows = sorted(
        inspection_rows,
        key=lambda row: (
            row.get("remainingHours") if row.get("remainingHours") is not None else 999999,
            row.get("remainingDays") if row.get("remainingDays") is not None else 999999,
            str(row.get("inspectionName") or ""),
        ),
    )
    top_row = ranked_rows[0]
    remaining_hours = top_row.get("remainingHours")
    remaining_days = top_row.get("remainingDays")
    risk = _risk_level(remaining_hours, remaining_days)
    aircraft_model = top_row.get("aircraftModel") or "Unknown"
    issue_title = top_row.get("inspectionName") or "Maintenance review required"
    task_rows = _task_rows_for_aircraft(aircraft)

    if risk == "Critical":
        summary = f"{aircraft}: {issue_title} is past its remaining limit and needs immediate attention."
        recommended = f"Ground or inspect {aircraft} before the next flight cycle."
    elif risk == "High":
        summary = f"{aircraft}: {issue_title} is approaching its limit and should be scheduled soon."
        recommended = f"Schedule maintenance for {aircraft} as soon as practical."
    elif risk == "Medium":
        summary = f"{aircraft}: {issue_title} is tracking toward its next limit."
        recommended = f"Monitor {aircraft} and prepare the next inspection window."
    else:
        summary = f"{aircraft}: No active maintenance issue detected from the current inspection rows."
        recommended = f"Continue routine monitoring for {aircraft}."

    return {
        "aircraftId": aircraft,
        "aircraft": aircraft,
        "aircraftModel": aircraft_model,
        "riskLevel": risk,
        "issueTitle": issue_title,
        "component": top_row.get("sourceRow") or issue_title,
        "shortFinding": summary,
        "managerSummary": summary,
        "managerSummarySource": "rule-fallback",
        "recommendedAction": recommended,
        "recommendedActions": [recommended],
        "manualReferences": [top_row.get("sourceRow")] if top_row.get("sourceRow") else [],
        "procedureReference": "Flask rule engine",
        "procedureTitle": "Rule-based maintenance prioritization",
        "procedureSummary": "Derived from remaining flight hours and calendar days stored in MongoDB.",
        "procedureSteps": [],
        "matchedRules": [
            {
                "ruleCode": f"{risk.upper()}-THRESHOLD",
                "description": f"Risk determined from thresholds: {rules['criticalRemainingHours']} FH critical, {rules['highRemainingHours']} FH high.",
            }
        ],
        "explanation": [
            f"Remaining hours: {remaining_hours if remaining_hours is not None else 'N/A'}",
            f"Remaining days: {remaining_days if remaining_days is not None else 'N/A'}",
        ],
        "defectDetails": task_rows[0] if task_rows else None,
        "defectDetailsSource": "tasks" if task_rows else "none",
        "scheduledTasks": task_rows,
    }


@blueprint.get("/health")
def health():
    return jsonify(_health_payload())


@blueprint.get("/maintenance-tracking")
def maintenance_tracking():
    rules = _rules_from_request()
    rows = _inspection_rows()
    aircraft_order = []
    rows_by_aircraft = {}

    for row in rows:
      aircraft = row.get("aircraft") or "Unknown"
      if aircraft not in rows_by_aircraft:
          rows_by_aircraft[aircraft] = []
          aircraft_order.append(aircraft)
      rows_by_aircraft[aircraft].append(row)

    insights = []
    for aircraft in aircraft_order:
        insight = _build_insight(aircraft, rows_by_aircraft[aircraft], rules)
        if insight:
            insights.append(insight)

    if not insights:
        task_aircraft = sorted(
            {task.get("aircraft") for task in get_db()["tasks"].find({}, {"aircraft": 1}) if task.get("aircraft")}
        )
        for aircraft in task_aircraft:
            tasks = _task_rows_for_aircraft(aircraft)
            if not tasks:
                continue
            insights.append(
                {
                    "aircraftId": aircraft,
                    "aircraft": aircraft,
                    "aircraftModel": "Unknown",
                    "riskLevel": "Low",
                    "issueTitle": "No maintenance issue detected",
                    "component": "",
                    "shortFinding": "No active maintenance flags found from the current records.",
                    "managerSummary": "No active maintenance flags found from the current records.",
                    "managerSummarySource": "rule-fallback",
                    "recommendedAction": "Continue routine monitoring.",
                    "recommendedActions": ["Continue routine monitoring."],
                    "manualReferences": [],
                    "procedureReference": "",
                    "procedureTitle": "",
                    "procedureSummary": "",
                    "procedureSteps": [],
                    "matchedRules": [],
                    "explanation": ["No inspection rows were available; using task history only."],
                    "defectDetails": tasks[0],
                    "defectDetailsSource": "tasks",
                    "scheduledTasks": tasks,
                }
            )

    insights.sort(
        key=lambda item: (
            {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}.get(item.get("riskLevel"), 9),
            str(item.get("aircraft") or ""),
        )
    )

    meta = {
        "llmEnabled": False,
        "activeModel": "Flask rule-based engine",
        "llmLimitApplied": 0,
        "llmSummaryCount": 0,
        "llmLastResult": {
            "message": "Rule-based insights generated from Mongo data.",
            "source": "flask-rule-engine",
        },
    }
    return jsonify({"success": True, "data": to_jsonable(insights), "meta": meta})


@blueprint.post("/rectification-task")
def rectification_task():
    body = request.get_json(silent=True) or {}
    body.pop("confirmAction", None)
    body["updatedAt"] = _utcnow()
    body.setdefault("createdAt", _utcnow())
    body.setdefault("status", "rectified")
    body.setdefault("source", "maintenance-tracking")
    body.setdefault("aircraft", body.get("aircraft") or "Unknown")
    body.setdefault("issueTitle", body.get("issueTitle") or "Maintenance issue")
    result = get_db()["maintenance_rectifications"].insert_one(body)
    body["_id"] = result.inserted_id
    return jsonify({"success": True, "message": "Rectification recorded", "data": to_jsonable(body)})
