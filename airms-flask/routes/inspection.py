from flask import Blueprint, jsonify, request

from services.mongo import get_db
from utils.mongo_helpers import parse_object_id, to_jsonable

blueprint = Blueprint("inspection", __name__)


@blueprint.get("/schedules")
def schedules():
    return jsonify(to_jsonable(list(get_db()["inspection_schedules"].find().sort("_id", -1))))


@blueprint.get("/schedules/<id>")
def schedule_by_id(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400
    doc = get_db()["inspection_schedules"].find_one({"_id": oid})
    if not doc:
        return jsonify({"message": "Not found"}), 404
    return jsonify(to_jsonable(doc))


@blueprint.get("/tasks")
def tasks_by_inspection():
    inspection_id = request.args.get("inspectionId")
    query = {"inspectionId": inspection_id} if inspection_id else {}
    return jsonify(to_jsonable(list(get_db()["inspection_tasks"].find(query))))
