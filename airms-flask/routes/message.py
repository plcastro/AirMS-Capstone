from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from services.mongo import get_db
from utils.mongo_helpers import parse_object_id, to_jsonable

blueprint = Blueprint("message", __name__)


def _messages():
    return get_db()["messages"]


def _conversations():
    return get_db()["conversations"]


@blueprint.get("/users")
@jwt_required()
def users():
    docs = list(get_db()["users"].find({}, {"password": 0, "passwordHash": 0}))
    return jsonify(to_jsonable(docs))


@blueprint.get("/conversations")
@jwt_required()
def conversations():
    me = get_jwt_identity()
    docs = list(_conversations().find({"participants": me}).sort("updatedAt", -1))
    return jsonify(to_jsonable(docs))


@blueprint.get("/summary")
@jwt_required()
def summary():
    me = get_jwt_identity()
    total = _messages().count_documents({"to": me, "read": {"$ne": True}})
    return jsonify({"unread": total})


@blueprint.post("/groups")
@jwt_required()
def create_group():
    body = request.get_json(silent=True) or {}
    body.setdefault("createdAt", datetime.utcnow())
    body.setdefault("updatedAt", datetime.utcnow())
    res = _conversations().insert_one(body)
    body["_id"] = res.inserted_id
    return jsonify(to_jsonable(body)), 201


@blueprint.get("/<other_user_id>")
@jwt_required()
def thread(other_user_id):
    me = get_jwt_identity()
    docs = list(_messages().find({"$or": [{"from": me, "to": other_user_id}, {"from": other_user_id, "to": me}]}).sort("createdAt", 1))
    return jsonify(to_jsonable(docs))


@blueprint.post("/")
@jwt_required()
def send_message():
    body = request.get_json(silent=True) or {}
    body.setdefault("createdAt", datetime.utcnow())
    body.setdefault("read", False)
    body.setdefault("from", get_jwt_identity())
    res = _messages().insert_one(body)
    body["_id"] = res.inserted_id
    return jsonify(to_jsonable(body)), 201
