from flask import Blueprint, jsonify
try:
    from db import get_db
except ImportError:
    import sys
    from pathlib import Path
    sys.path.append(str(Path(__file__).resolve().parents[1]))
    from db import get_db

aircraft_bp = Blueprint("aircraft_api", __name__, url_prefix="/api/aircraft")


@aircraft_bp.get('/aircraft-with-bases')
def aircraft_with_bases():
    db = get_db()
    rows = list(db.aircrafts.find({}, {'rpc': 1, 'base': 1, 'aircraftModel': 1}))
    data = []
    for r in rows:
        data.append({
            '_id': str(r.get('_id')),
            'rpc': r.get('rpc') or r.get('aircraft') or '',
            'base': r.get('base') or 'MANILA',
            'aircraftModel': r.get('aircraftModel') or 'AS350B3'
        })
    return jsonify({"success": True, "data": data})


