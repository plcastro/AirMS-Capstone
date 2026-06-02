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

pre_bp = Blueprint("pre_inspections_api", __name__, url_prefix="/api/pre-inspections")
post_bp = Blueprint("post_inspections_api", __name__, url_prefix="/api/post-inspections")


def _utcnow():
    return datetime.now(timezone.utc)


def _oid(v):
    try:
        return ObjectId(v)
    except Exception:
        return None


def _ser(d):
    x = dict(d)
    x["_id"] = str(x.get("_id"))
    for key, value in list(x.items()):
        if isinstance(value, datetime):
            x[key] = value.isoformat()
        elif isinstance(value, ObjectId):
            x[key] = str(value)
    return x


@pre_bp.get('/getAllPreInspection')
def pre_all():
    try:
        db = get_db()
        rows = list(db.pre_inspections.find({}).sort('createdAt', -1))
        return jsonify({"status": "Ok", "data": [_ser(r) for r in rows]})
    except Exception as exc:
        return jsonify({"status": "Ok", "data": [], "message": f"Pre inspections fallback: {str(exc)}"})


@pre_bp.post('/createPreInspection')
def pre_create():
    db = get_db()
    p = request.get_json(silent=True) or {}
    p.setdefault('createdAt', _utcnow())
    p.setdefault('updatedAt', _utcnow())
    res = db.pre_inspections.insert_one(p)
    row = db.pre_inspections.find_one({'_id': res.inserted_id})
    return jsonify({"message": "Pre-inspection created", "data": _ser(row)})


@pre_bp.put('/updatePreInspectionById/<id>')
def pre_update(id):
    db = get_db()
    p = request.get_json(silent=True) or {}
    p['updatedAt'] = _utcnow()
    row = db.pre_inspections.find_one_and_update({'_id': _oid(id)}, {'$set': p}, return_document=ReturnDocument.AFTER)
    if not row:
        return jsonify({"message": "Pre-inspection not found"}), 404
    return jsonify({"message": "Pre-inspection updated", "data": _ser(row)})


@post_bp.get('/getAllPostInspection')
def post_all():
    try:
        db = get_db()
        rows = list(db.post_inspections.find({}).sort('createdAt', -1))
        return jsonify({"status": "Ok", "data": [_ser(r) for r in rows]})
    except Exception as exc:
        return jsonify({"status": "Ok", "data": [], "message": f"Post inspections fallback: {str(exc)}"})


@post_bp.post('/createPostInspection')
def post_create():
    db = get_db()
    p = request.get_json(silent=True) or {}
    p.setdefault('createdAt', _utcnow())
    p.setdefault('updatedAt', _utcnow())
    res = db.post_inspections.insert_one(p)
    row = db.post_inspections.find_one({'_id': res.inserted_id})
    return jsonify({"message": "Post-inspection created", "data": _ser(row)})


@post_bp.put('/updatePostInspectionById/<id>')
def post_update(id):
    db = get_db()
    p = request.get_json(silent=True) or {}
    p['updatedAt'] = _utcnow()
    row = db.post_inspections.find_one_and_update({'_id': _oid(id)}, {'$set': p}, return_document=ReturnDocument.AFTER)
    if not row:
        return jsonify({"message": "Post-inspection not found"}), 404
    return jsonify({"message": "Post-inspection updated", "data": _ser(row)})


