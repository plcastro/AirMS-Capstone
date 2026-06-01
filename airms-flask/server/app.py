import os
from pathlib import Path
from flask import Flask, make_response, request, send_from_directory
from routes.api import api_bp
from routes.legacy_api import legacy_api_bp
from routes.user import user_bp
from routes.tasks import tasks_bp
from routes.parts_monitoring import parts_bp
from routes.inspections import inspections_bp
from routes.flightlogs import flightlogs_bp
from routes.inspections_logs import pre_bp, post_bp
from routes.maintenance_logs import maint_bp
from routes.parts_requisition import req_bp
from routes.messages import msg_bp
from routes.notifications import notif_bp
from routes.logs import logs_bp
from routes.aircraft import aircraft_bp
from routes.events import sse_bp


def create_app() -> Flask:
    root_dir = Path(__file__).resolve().parent
    client_dist = root_dir.parent / "client-web" / "dist"

    app = Flask(__name__)

    allowed_origins = {
        "http://127.0.0.1:5000",
        "http://localhost:5000",
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    }

    @app.before_request
    def handle_preflight():
        if request.method == "OPTIONS":
            response = make_response("", 204)
            origin = request.headers.get("Origin")
            if origin in allowed_origins:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = (
                "Content-Type, Authorization, x-platform, x-base, x-session-id, "
                "x-action-confirmed, x-confirm-action"
            )
            response.headers["Vary"] = "Origin"
            return response
        return None

    @app.after_request
    def apply_cors_headers(response):
        origin = request.headers.get("Origin")
        if origin in allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Vary"] = "Origin"
        return response

    app.register_blueprint(api_bp, url_prefix="/api")
    app.register_blueprint(user_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(parts_bp)
    app.register_blueprint(inspections_bp)
    app.register_blueprint(flightlogs_bp)
    app.register_blueprint(pre_bp)
    app.register_blueprint(post_bp)
    app.register_blueprint(maint_bp)
    app.register_blueprint(req_bp)
    app.register_blueprint(msg_bp)
    app.register_blueprint(notif_bp)
    app.register_blueprint(logs_bp)
    app.register_blueprint(aircraft_bp)
    app.register_blueprint(sse_bp)
    app.register_blueprint(legacy_api_bp)

    @app.get("/uploads/<path:filename>")
    def uploads(filename: str):
        return send_from_directory(root_dir / "uploads", filename)

    @app.get("/")
    def serve_index():
        if client_dist.exists():
            return send_from_directory(client_dist, "index.html")
        return "AirMS Flask is running. Build client-web to serve exact UI.", 200

    @app.get("/<path:path>")
    def serve_client(path: str):
        if client_dist.exists():
            candidate = client_dist / path
            if candidate.exists() and candidate.is_file():
                return send_from_directory(client_dist, path)
            return send_from_directory(client_dist, "index.html")
        return "Not found", 404

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=True)
