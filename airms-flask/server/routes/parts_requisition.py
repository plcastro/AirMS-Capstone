from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from bson import ObjectId
from pymongo import ReturnDocument
try:
    from db import get_db
except ImportError:
    import sys
    from pathlib import Path
    sys.path.append(str(Path(__file__).resolve().parents[1]))
    from db import get_db

req_bp = Blueprint("parts_requisition_api", __name__, url_prefix="/api/parts-requisition")


def _utcnow():
    return datetime.now(timezone.utc)


def _oid(v):
    try:
        return ObjectId(v)
    except Exception:
        return None


def _primary_col(db):
    return db.partsrequisitions


def _legacy_col(db):
    return db.parts_requisitions


def _sort_token(row):
    value = row.get('createdAt') or row.get('updatedAt') or row.get('dateRequested')
    if isinstance(value, datetime):
        return value.timestamp()
    if isinstance(value, str) and value:
        try:
            return datetime.fromisoformat(value.replace('Z', '+00:00')).timestamp()
        except ValueError:
            pass
    oid = row.get('_id')
    return oid.generation_time.timestamp() if isinstance(oid, ObjectId) else 0.0


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


@req_bp.get('/get-all-requisition')
def get_all_requisition():
    try:
        db = get_db()
        primary_rows = list(_primary_col(db).find({}))
        legacy_rows = list(_legacy_col(db).find({}))
        rows_by_id = {str(row.get('_id')): row for row in primary_rows + legacy_rows}
        rows = list(rows_by_id.values())
        rows.sort(key=_sort_token, reverse=True)
        return jsonify({"success": True, "data": [_ser(r) for r in rows]})
    except Exception as exc:
        return jsonify({
            "success": True,
            "data": [],
            "message": f"Parts requisition fallback: {str(exc)}",
        })


@req_bp.post('/create-requisition')
def create_requisition():
    db = get_db()
    p = request.get_json(silent=True) or {}
    p.setdefault('status', 'Pending')
    p.setdefault('createdAt', _utcnow())
    p.setdefault('updatedAt', _utcnow())
    res = _primary_col(db).insert_one(p)
    _legacy_col(db).replace_one({'_id': res.inserted_id}, p, upsert=True)
    row = _primary_col(db).find_one({'_id': res.inserted_id})
    return jsonify({"success": True, "message": "Requisition created", "data": _ser(row)})


@req_bp.put('/update-requisition/<id>')
def update_requisition(id):
    db = get_db()
    p = request.get_json(silent=True) or {}
    p['updatedAt'] = _utcnow()
    oid = _oid(id)
    row = _primary_col(db).find_one_and_update({'_id': oid}, {'$set': p}, return_document=ReturnDocument.AFTER)
    legacy_row = _legacy_col(db).find_one_and_update({'_id': oid}, {'$set': p}, return_document=ReturnDocument.AFTER)
    if not row and not legacy_row:
        return jsonify({"success": False, "message": "Requisition not found"}), 404
    return jsonify({"success": True, "message": "Requisition updated", "data": _ser(row or legacy_row)})


