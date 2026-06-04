from datetime import datetime

from bson import ObjectId
from flask import jsonify


def parse_object_id(value):
    try:
        return ObjectId(value)
    except Exception:
        return None


def to_jsonable(document):
    if isinstance(document, list):
        return [to_jsonable(item) for item in document]
    if isinstance(document, dict):
        out = {}
        for key, value in document.items():
            if isinstance(value, ObjectId):
                out[key] = str(value)
            elif isinstance(value, datetime):
                out[key] = value.isoformat()
            elif isinstance(value, dict):
                out[key] = to_jsonable(value)
            elif isinstance(value, list):
                out[key] = [to_jsonable(v) for v in value]
            else:
                out[key] = value
        return out
    return document


def not_found(entity="Record"):
    return jsonify({"message": f"{entity} not found"}), 404
