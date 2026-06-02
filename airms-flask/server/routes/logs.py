from datetime import datetime

from bson import ObjectId
from flask import Blueprint, jsonify, request
try:
    from db import get_db
except ImportError:
    import sys
    from pathlib import Path
    sys.path.append(str(Path(__file__).resolve().parents[1]))
    from db import get_db

logs_bp = Blueprint("logs_api", __name__, url_prefix="/api/logs")


def _ser(d):
    def _convert(value):
        if isinstance(value, datetime):
            return value.isoformat()
        if isinstance(value, ObjectId):
            return str(value)
        if isinstance(value, dict):
            return {k: _convert(v) for k, v in value.items()}
        if isinstance(value, list):
            return [_convert(v) for v in value]
        return value

    x = dict(d or {})
    x["_id"] = str(x.get("_id"))
    return _convert(x)


@logs_bp.get('/getAllUserLogs')
def get_all_user_logs():
    try:
        db = get_db()
        page = max(int(request.args.get('page', 1)), 1)
        limit = max(min(int(request.args.get('limit', 50)), 2000), 1)
        skip = (page - 1) * limit

        query = {}
        start_date = request.args.get("startDate")
        end_date = request.args.get("endDate")
        if start_date or end_date:
            created_at = {}
            if start_date:
                try:
                    created_at["$gte"] = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
                except Exception:
                    pass
            if end_date:
                try:
                    created_at["$lte"] = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
                except Exception:
                    pass
            if created_at:
                query["createdAt"] = created_at

        rows = list(db.userlogs.find(query).sort('createdAt', -1).skip(skip).limit(limit))
        total = db.userlogs.count_documents(query)
        return jsonify({"status": "Ok", "data": [_ser(r) for r in rows], "total": total})
    except Exception as exc:
        return jsonify({
            "status": "Ok",
            "data": [],
            "total": 0,
            "message": f"User logs fallback: {str(exc)}",
        })


