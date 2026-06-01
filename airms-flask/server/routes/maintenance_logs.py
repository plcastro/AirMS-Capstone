from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from bson import ObjectId
try:
    from db import get_db
except ImportError:
    import sys
    from pathlib import Path
    sys.path.append(str(Path(__file__).resolve().parents[1]))
    from db import get_db

maint_bp = Blueprint("maintenance_logs_api", __name__, url_prefix="/api/maintenance-logs")


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


@maint_bp.get('/getAllMaintenanceLog')
def get_all_maintenance_logs():
    try:
        db = get_db()
        rows = list(db.maintenancelogs.find({}).sort('createdAt', -1))
        return jsonify({"status": "Ok", "data": [_ser(r) for r in rows]})
    except Exception as exc:
        return jsonify({
            "status": "Ok",
            "data": [],
            "message": f"Maintenance logs fallback: {str(exc)}",
        })


