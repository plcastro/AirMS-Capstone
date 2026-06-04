from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request

from services.mongo import get_db
from utils.mongo_helpers import parse_object_id, to_jsonable

blueprint = Blueprint("parts_monitoring", __name__)


def _col():
    return get_db()["parts_monitoring"]


DEFAULT_RULES = {
    "criticalDueDays": 5,
    "criticalRemainingHours": 14,
    "highDueDays": 7,
    "highRemainingHours": 24,
    "mediumDueDays": 14,
    "longTurnaroundHours": 5,
}


def _success(data=None, **extra):
    return jsonify({"success": True, "data": to_jsonable(data), **extra})


def _latest_by_aircraft(aircraft):
    return _col().find_one({"aircraft": aircraft}, sort=[("updatedAt", -1), ("_id", -1)])


def _remaining_value(row, *keys):
    for key in keys:
        value = row.get(key)
        if value not in (None, "", "N/A"):
            try:
                return float(value)
            except (TypeError, ValueError):
                continue
    return None


def _iter_aircraft_parts():
    seen = set()
    for aircraft in _col().distinct("aircraft"):
        if not aircraft or aircraft in seen:
            continue
        doc = _latest_by_aircraft(aircraft)
        if doc:
            seen.add(aircraft)
            yield aircraft, doc


def _inspection_rows():
    rows = []
    for aircraft, doc in _iter_aircraft_parts():
        reference = doc.get("referenceData") or {}
        for index, part in enumerate(doc.get("parts") or []):
            if not isinstance(part, dict):
                continue
            name = part.get("inspectionName") or part.get("componentName") or part.get("partName") or part.get("component")
            if not name:
                continue
            remaining_hours = _remaining_value(part, "remainingHours", "timeRemaining")
            remaining_days = _remaining_value(part, "remainingDays", "daysRemaining")
            due_date = part.get("dueDate") or part.get("dateDue")
            rows.append(
                {
                    "aircraft": aircraft,
                    "aircraftModel": doc.get("aircraftType") or part.get("aircraftModel") or reference.get("aircraftType"),
                    "inspectionName": name,
                    "remainingHours": remaining_hours,
                    "remainingDays": remaining_days,
                    "dueDate": due_date,
                    "dueAtHours": _remaining_value(part, "dueAtHours", "ttCycleDue"),
                    "sourceRow": part.get("componentName") or part.get("sourceRow") or name,
                    "priority": part.get("priority"),
                    "rowIndex": index,
                }
            )
    return rows


def _priority_level(row, rules):
    hours = row.get("remainingHours")
    days = row.get("remainingDays")
    triggers = []
    if hours is not None and hours <= rules["criticalRemainingHours"]:
        triggers.append(f"<= {rules['criticalRemainingHours']} FH")
    if days is not None and days <= rules["criticalDueDays"]:
        triggers.append(f"<= {rules['criticalDueDays']} days")
    if triggers:
        return "Critical", triggers
    if hours is not None and hours <= rules["highRemainingHours"]:
        triggers.append(f"<= {rules['highRemainingHours']} FH")
    if days is not None and days <= rules["highDueDays"]:
        triggers.append(f"<= {rules['highDueDays']} days")
    if triggers:
        return "High", triggers
    if days is not None and days <= rules["mediumDueDays"]:
        return "Medium", [f"<= {rules['mediumDueDays']} days"]
    return "Low", ["No immediate threshold"]


def _rules_from_request():
    rules = DEFAULT_RULES.copy()
    saved = get_db()["maintenance_priority_rules"].find_one({}, {"_id": 0}) or {}
    rules.update({key: saved.get(key, value) for key, value in DEFAULT_RULES.items()})
    for key in DEFAULT_RULES:
      if request.args.get(key) is not None:
          try:
              rules[key] = float(request.args.get(key))
          except (TypeError, ValueError):
              pass
    return rules


@blueprint.get("")
@blueprint.get("/")
def get_all():
    return _success(list(_col().find().sort("_id", -1)))


@blueprint.get("/aircraft-list")
def aircraft_list():
    docs = _col().distinct("aircraft")
    return _success([aircraft for aircraft in docs if aircraft])


@blueprint.get("/maintenance-priority/rules")
def get_rules():
    rules = DEFAULT_RULES.copy()
    rules.update(get_db()["maintenance_priority_rules"].find_one({}, {"_id": 0}) or {})
    return _success(rules)


@blueprint.put("/maintenance-priority/rules")
def put_rules():
    body = request.get_json(silent=True) or {}
    get_db()["maintenance_priority_rules"].delete_many({})
    rules = DEFAULT_RULES.copy()
    if isinstance(body, dict):
        rules.update({key: body.get(key, value) for key, value in DEFAULT_RULES.items()})
    get_db()["maintenance_priority_rules"].insert_one(rules)
    return _success(rules, message="Rules saved")


@blueprint.get("/maintenance-priority")
def maintenance_priority():
    rules = _rules_from_request()
    rows = []
    for row in _inspection_rows():
        level, triggers = _priority_level(row, rules)
        hours = row.get("remainingHours")
        days = row.get("remainingDays")
        turnaround = max(1, round((abs(float(hours or 0)) / 12) if hours is not None else rules["longTurnaroundHours"], 1))
        rows.append(
            {
                **row,
                "priorityLevel": level,
                "priorityTriggers": triggers,
                "priorityReason": f"{level} based on remaining hours/days thresholds",
                "nextInspection": row.get("inspectionName"),
                "dueByHours": hours,
                "dueByDays": days,
                "dueBasis": "hours-and-calendar" if hours is not None and days is not None else "hours" if hours is not None else "calendar",
                "estimatedTurnaroundHours": turnaround,
                "usedHistoricalEstimate": False,
                "inspectionKey": f"{row.get('aircraft')}-{row.get('inspectionName')}-{row.get('rowIndex')}",
            }
        )
    rank_weight = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    rows.sort(key=lambda item: (rank_weight.get(item["priorityLevel"], 9), item.get("dueByHours") if item.get("dueByHours") is not None else 999999, item.get("dueByDays") if item.get("dueByDays") is not None else 999999))
    for index, row in enumerate(rows, start=1):
        row["rank"] = index
    return _success(rows, meta={"rules": rules, "tieBreakHours": 5, "tieBreakDays": 7, "tieBreakUrgencyRatio": 0.2})


@blueprint.get("/inspection-remaining-hours")
def remaining_hours():
    return _success(_inspection_rows())


@blueprint.get("/<aircraft>")
def by_aircraft(aircraft):
    doc = _latest_by_aircraft(aircraft)
    if not doc:
        return jsonify({"success": False, "message": "Aircraft data not found"}), 404
    return _success(doc)


@blueprint.post("/save")
def save():
    body = request.get_json(silent=True) or {}
    body.pop("confirmAction", None)
    body["updatedAt"] = datetime.utcnow()
    body.setdefault("createdAt", datetime.utcnow())
    aircraft = body.get("aircraft")
    if aircraft:
        result = _col().update_one(
            {"aircraft": aircraft},
            {"$set": body, "$setOnInsert": {"createdAt": body["createdAt"]}},
            upsert=True,
        )
        doc = _latest_by_aircraft(aircraft)
        return _success(doc, message="Saved"), 201 if result.upserted_id else 200
    result = _col().insert_one(body)
    body["_id"] = result.inserted_id
    return _success(body), 201


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
    payload["updatedAt"] = datetime.utcnow()
    res = _col().update_many({"aircraft": aircraft}, {"$set": {"referenceData.acftTT": payload.get("acftTT"), "referenceData.n1Cycles": payload.get("n1Cycles"), "referenceData.n2Cycles": payload.get("n2Cycles"), "referenceData.landings": payload.get("landings"), "updatedAt": payload["updatedAt"]}})
    return jsonify({"success": True, "message": "Updated", "count": res.modified_count})
