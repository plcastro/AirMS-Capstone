from datetime import datetime

from flask import Blueprint, jsonify, request

from services.mongo import get_db
from utils.mongo_helpers import parse_object_id, to_jsonable

blueprint = Blueprint("maintenance_log", __name__)
MAINTENANCE_LOG_COLLECTIONS = ("maintenance_logs", "maintenancelogs")


def _col():
    return get_db()["maintenance_logs"]


def _collections():
    db = get_db()
    return [db[name] for name in MAINTENANCE_LOG_COLLECTIONS]


def _merge_docs(docs):
    merged = {}
    for doc in docs:
        key = str(doc.get("_id") or doc.get("id") or doc.get("sourceTaskId") or "")
        if key:
            merged[key] = doc
    return list(merged.values())


def _find_all():
    docs = []
    for collection in _collections():
        docs.extend(list(collection.find()))
    def _key(doc):
        value = doc.get("createdAt") or doc.get("updatedAt") or doc.get("_id")
        if isinstance(value, datetime):
            return (0, value.timestamp())
        return (1, str(value or ""))

    return sorted(_merge_docs(docs), key=_key, reverse=True)


def _find_one(id_value):
    oid = parse_object_id(id_value)
    for collection in _collections():
        if oid:
            doc = collection.find_one({"_id": oid})
            if doc:
                return doc, collection
        doc = collection.find_one({"sourceTaskId": str(id_value)})
        if doc:
            return doc, collection
    return None, None


@blueprint.get("/getAllMaintenanceLog")
def list_items():
    return jsonify({"success": True, "data": to_jsonable(_find_all())})


@blueprint.get("/getMaintenanceLogById/<id>")
def get_item(id):
    if not parse_object_id(id):
        return jsonify({"message": "Invalid id"}), 400
    doc, _ = _find_one(id)
    if not doc:
        return jsonify({"message": "Not found"}), 404
    return jsonify({"success": True, "data": to_jsonable(doc)})


@blueprint.post("")
@blueprint.post("/")
def create_item():
    body = request.get_json(silent=True) or {}
    body.setdefault("createdAt", datetime.utcnow())
    body["updatedAt"] = datetime.utcnow()
    result = _col().insert_one(body)
    body["_id"] = result.inserted_id
    return jsonify({"success": True, "data": to_jsonable(body)}), 201


@blueprint.put("/<id>")
def update_item(id):
    if not parse_object_id(id):
        return jsonify({"message": "Invalid id"}), 400
    doc, collection = _find_one(id)
    if not doc or collection is None:
        return jsonify({"message": "Not found"}), 404
    body = request.get_json(silent=True) or {}
    body["updatedAt"] = datetime.utcnow()
    res = collection.update_one({"_id": doc["_id"]}, {"$set": body})
    if not res.matched_count:
        return jsonify({"message": "Not found"}), 404
    doc = collection.find_one({"_id": doc["_id"]})
    return jsonify({"success": True, "message": "Updated", "data": to_jsonable(doc)})


@blueprint.delete("/<id>")
def delete_item(id):
    if not parse_object_id(id):
        return jsonify({"message": "Invalid id"}), 400
    doc, collection = _find_one(id)
    if not doc or collection is None:
        return jsonify({"message": "Not found"}), 404
    res = collection.delete_one({"_id": doc["_id"]})
    if not res.deleted_count:
        return jsonify({"message": "Not found"}), 404
    return jsonify({"message": "Deleted"})
