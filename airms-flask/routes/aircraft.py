from flask import Blueprint, jsonify

from services.mongo import get_db
from utils.mongo_helpers import to_jsonable

blueprint = Blueprint("aircraft", __name__)


@blueprint.get("/aircraft-tail-numbers")
def get_tail_numbers():
    docs = list(get_db()["aircraft"].find({}, {"_id": 0, "rpc": 1, "tailNumber": 1}))
    return jsonify(to_jsonable(docs))


@blueprint.get("/aircraft-with-bases")
def get_aircraft_with_bases():
    docs = list(get_db()["aircraft"].find({}, {"tailNumber": 1, "rpc": 1, "base": 1}))
    return jsonify(to_jsonable(docs))


@blueprint.get("/technical-logs")
def get_technical_logs():
    docs = list(get_db()["technical_logs"].find().sort("_id", -1).limit(200))
    return jsonify(to_jsonable(docs))
