from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request

from services.mongo import get_db
from utils.mongo_helpers import parse_object_id, to_jsonable

blueprint = Blueprint("parts_monitoring", __name__)
PARTS_MONITORING_COLLECTIONS = ("parts_monitoring", "partslifespanmonitorings")
AIRCRAFT_COLLECTIONS = ("aircrafts",)


def _col():
    return get_db()["parts_monitoring"]


def _collections():
    db = get_db()
    return [db[name] for name in PARTS_MONITORING_COLLECTIONS]


def _aircraft_collections():
    db = get_db()
    return [db[name] for name in AIRCRAFT_COLLECTIONS]


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
    candidates = []
    for collection in _collections():
        candidates.extend(list(collection.find({"aircraft": aircraft})))
    if not candidates:
        return None
    def _key(doc):
        value = doc.get("updatedAt") or doc.get("createdAt") or doc.get("_id")
        if isinstance(value, datetime):
            return (0, value.timestamp())
        return (1, str(value or ""))

    candidates.sort(key=_key, reverse=True)
    return candidates[0]


def _find_by_id(id_value):
    oid = parse_object_id(id_value)
    for collection in _collections():
        if oid:
            doc = collection.find_one({"_id": oid})
            if doc:
                return doc, collection
        doc = collection.find_one({"_id": id_value})
        if doc:
            return doc, collection
    return None, None


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
    aircraft_values = []
    for collection in _collections():
        aircraft_values.extend(collection.distinct("aircraft"))
    for collection in _aircraft_collections():
        aircraft_values.extend(collection.distinct("rpc"))
        aircraft_values.extend(collection.distinct("aircraft"))
        aircraft_values.extend(collection.distinct("registration"))
    for aircraft in aircraft_values:
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
    rows = []
    seen = set()
    for aircraft, doc in _iter_aircraft_parts():
        if aircraft in seen:
            continue
        seen.add(aircraft)
        rows.append(doc)
    def _key(doc):
        value = doc.get("updatedAt") or doc.get("createdAt") or doc.get("_id")
        if isinstance(value, datetime):
            return (0, value.timestamp())
        return (1, str(value or ""))

    rows.sort(key=_key, reverse=True)
    return _success(rows)


@blueprint.get("/aircraft-list")
def aircraft_list():
    values = set()
    for collection in _collections():
        values.update(value for value in collection.distinct("aircraft") if value)
    for collection in _aircraft_collections():
        values.update(value for value in collection.distinct("rpc") if value)
        values.update(value for value in collection.distinct("aircraft") if value)
        values.update(value for value in collection.distinct("registration") if value)
    return _success(sorted(values))


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
    rows_by_aircraft = {}
    for row in _inspection_rows():
        level, triggers = _priority_level(row, rules)
        hours = row.get("remainingHours")
        days = row.get("remainingDays")
        turnaround = max(1, round((abs(float(hours or 0)) / 12) if hours is not None else rules["longTurnaroundHours"], 1))
        priority_row = {
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
        aircraft = str(row.get("aircraft") or "").strip()
        if not aircraft:
            continue
        existing = rows_by_aircraft.get(aircraft)
        if existing is None:
            rows_by_aircraft[aircraft] = priority_row
            continue
        if _priority_sort_key(priority_row) < _priority_sort_key(existing):
            rows_by_aircraft[aircraft] = priority_row

    rows = list(rows_by_aircraft.values())
    rows.sort(key=_priority_sort_key)
    for index, row in enumerate(rows, start=1):
        row["rank"] = index
    return _success(rows, meta={"rules": rules, "tieBreakHours": 5, "tieBreakDays": 7, "tieBreakUrgencyRatio": 0.2})


def _priority_sort_key(item):
    rank_weight = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    return (
        rank_weight.get(item["priorityLevel"], 9),
        item.get("dueByHours") if item.get("dueByHours") is not None else 999999,
        item.get("dueByDays") if item.get("dueByDays") is not None else 999999,
    )


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
        matched = 0
        for collection in _collections():
            result = collection.update_many(
                {"aircraft": aircraft},
                {"$set": body, "$setOnInsert": {"createdAt": body["createdAt"]}},
                upsert=False,
            )
            matched += result.matched_count
        if not matched:
            result = _col().insert_one(body)
            body["_id"] = result.inserted_id
        doc = _latest_by_aircraft(aircraft)
        return _success(doc, message="Saved"), 201 if matched == 0 else 200
    result = _col().insert_one(body)
    body["_id"] = result.inserted_id
    return _success(body), 201


@blueprint.delete("/<id>")
def delete_by_id(id):
    if not parse_object_id(id):
        return jsonify({"message": "Invalid id"}), 400
    doc, collection = _find_by_id(id)
    if not doc or collection is None:
        return jsonify({"message": "Not found"}), 404
    res = collection.delete_one({"_id": doc["_id"]})
    if not res.deleted_count:
        return jsonify({"message": "Not found"}), 404
    return jsonify({"message": "Deleted"})


@blueprint.delete("/aircraft/<aircraft>")
def delete_by_aircraft(aircraft):
    deleted = 0
    for collection in _collections():
        deleted += collection.delete_many({"aircraft": aircraft}).deleted_count
    return jsonify({"message": "Deleted", "count": deleted})


@blueprint.put("/<aircraft>/update-totals")
def update_totals(aircraft):
    payload = request.get_json(silent=True) or {}
    payload["updatedAt"] = datetime.utcnow()
    modified = 0
    for collection in _collections():
        res = collection.update_many({"aircraft": aircraft}, {"$set": {"referenceData.acftTT": payload.get("acftTT"), "referenceData.n1Cycles": payload.get("n1Cycles"), "referenceData.n2Cycles": payload.get("n2Cycles"), "referenceData.landings": payload.get("landings"), "updatedAt": payload["updatedAt"]}})
        modified += res.modified_count
    return jsonify({"success": True, "message": "Updated", "count": modified})
