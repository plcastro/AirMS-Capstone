from flask import Blueprint, jsonify, request

try:
    from db import get_db
except ImportError:
    import sys
    from pathlib import Path
    sys.path.append(str(Path(__file__).resolve().parents[1]))
    from db import get_db

inspections_bp = Blueprint("inspections_api", __name__, url_prefix="/api/inspections")


@inspections_bp.get("/schedules")
def schedules():
    db = get_db()
    rows = list(db.inspection_schedules.find({}))
    if not rows:
        # Fallback defaults so UI can function even before full migration
        rows = [
            {
                "_id": "default-pre-1",
                "inspectionName": "Pre-Flight Inspection",
                "aircraftModel": "AS350B3",
            },
            {
                "_id": "default-post-1",
                "inspectionName": "Post-Flight Inspection",
                "aircraftModel": "AS350B3",
            },
        ]
    else:
        for r in rows:
            r["_id"] = str(r.get("_id"))
    return jsonify(rows)


@inspections_bp.get("/schedules/<id>")
def schedule_by_id(id):
    db = get_db()
    row = db.inspection_schedules.find_one({"_id": id})
    if not row:
        return jsonify({"message": "Inspection schedule not found"}), 404
    row["_id"] = str(row.get("_id"))
    return jsonify(row)


@inspections_bp.get("/tasks")
def inspection_tasks():
    db = get_db()
    inspection_name = request.args.get("inspectionName")
    aircraft_model = request.args.get("aircraftModel")

    query = {}
    if inspection_name:
        query["inspectionName"] = inspection_name
    if aircraft_model:
        query["aircraftModel"] = aircraft_model

    rows = list(db.inspection_tasks.find(query))
    if not rows:
        return jsonify([
            {
                "taskId": "INSP-001",
                "taskName": "General visual inspection",
                "inspectionName": inspection_name or "Inspection",
                "aircraftModel": aircraft_model or "AS350B3",
                "inspectionTypeFull": "Standard",
                "description": "Perform standard visual walkaround and safety checks.",
                "documentation": "AMM 05-00-00",
            }
        ])

    for r in rows:
        r["_id"] = str(r.get("_id"))
    return jsonify(rows)


