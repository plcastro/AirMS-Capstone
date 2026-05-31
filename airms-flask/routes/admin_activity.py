from flask import Blueprint, jsonify, request

from services.mongo import get_db
from utils.mongo_helpers import to_jsonable

blueprint = Blueprint("admin_activity", __name__)


@blueprint.get("/")
def get_activity_logs():
    limit = int(request.args.get("limit", 200))
    docs = list(get_db()["admin_activity_logs"].find().sort("_id", -1).limit(limit))
    return jsonify(to_jsonable(docs))


@blueprint.get("/summary")
def summary():
    total = get_db()["admin_activity_logs"].count_documents({})
    return jsonify({"total": total})


@blueprint.get("/recent")
def recent():
    docs = list(get_db()["admin_activity_logs"].find().sort("_id", -1).limit(20))
    return jsonify(to_jsonable(docs))


@blueprint.get("/users")
def active_users():
    pipeline = [
        {"$group": {"_id": "$actorId", "lastActionAt": {"$max": "$createdAt"}}},
        {"$sort": {"lastActionAt": -1}},
        {"$limit": 50},
    ]
    docs = list(get_db()["admin_activity_logs"].aggregate(pipeline))
    return jsonify(to_jsonable(docs))
