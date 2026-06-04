from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from services.mongo import get_db
from utils.mongo_helpers import to_jsonable

blueprint = Blueprint("logs", __name__)


def _parse_date(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _as_datetime(value):
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        return _parse_date(value)
    return None


def _date_query():
    start_date = _parse_date(request.args.get("startDate"))
    end_date = _parse_date(request.args.get("endDate"))
    query = {}
    if start_date or end_date:
        bounds = {}
        if start_date:
            bounds["$gte"] = start_date
        if end_date:
            bounds["$lte"] = end_date
        query["$or"] = [
            {"createdAt": bounds},
            {"dateTime": bounds},
        ]
    return query


def _normalize_log(row, index):
    date_time = row.get("dateTime") or row.get("createdAt") or row.get("timestamp")
    parsed = _as_datetime(date_time)
    if parsed and parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)

    username = (
        row.get("username")
        or row.get("actorName")
        or row.get("actor")
        or row.get("performedBy")
        or row.get("user")
        or "Unknown"
    )
    action = (
        row.get("actionMade")
        or row.get("action")
        or row.get("message")
        or " ".join(str(row.get(key, "")) for key in ("method", "path") if row.get(key))
        or "N/A"
    )

    normalized = dict(row)
    normalized.update(
        {
            "index": index,
            "dateTime": parsed.isoformat() if parsed else date_time,
            "actionMade": action,
            "username": username,
            "platform": row.get("platform") or row.get("client") or "WEB",
            "base": row.get("base") or row.get("station") or "UNKNOWN",
        }
    )
    return normalized


@blueprint.get("/getAllUserLogs")
def get_all_user_logs():
    page = max(int(request.args.get("page", 1)), 1)
    limit = max(min(int(request.args.get("limit", 50)), 2000), 1)
    skip = (page - 1) * limit
    db = get_db()
    query = _date_query()

    collection = db["userlogs"]
    total = collection.count_documents(query)
    rows = list(collection.find(query).sort([("createdAt", -1), ("dateTime", -1), ("_id", -1)]).skip(skip).limit(limit))

    if not rows and total == 0:
        collection = db["admin_activity_logs"]
        total = collection.count_documents(query)
        rows = list(collection.find(query).sort([("createdAt", -1), ("dateTime", -1), ("_id", -1)]).skip(skip).limit(limit))

    normalized = [_normalize_log(row, skip + idx + 1) for idx, row in enumerate(rows)]
    return jsonify({"status": "Ok", "data": to_jsonable(normalized), "total": total, "page": page, "limit": limit})
