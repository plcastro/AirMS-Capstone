from datetime import timedelta
import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, request, send_from_directory, url_for
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config import Config
from middleware.audit import audit_mutating_request
from middleware.auth import register_auth_handlers
from middleware.request_context import attach_request_context
from routes.ai_insights import blueprint as ai_insights_bp
from realtime import events_blueprint
from routes.legacy_api import legacy_api_bp
from routes import register_blueprints
from services.mongo import init_mongo
from utils.events import publish_event
# from web_routes import web_blueprint


def create_app() -> Flask:
    app_root = Path(__file__).resolve().parent
    flask_env = app_root / ".env"
    server_env = app_root.parent / "server" / ".env"
    if flask_env.exists():
        load_dotenv(flask_env, override=True)
    if server_env.exists():
        load_dotenv(server_env, override=False)
    app = Flask(__name__)
    app.config.from_object(Config)
    app.config["MONGO_URI"] = os.getenv("MONGO_URI") or os.getenv("ATLAS_URL") or app.config.get("MONGO_URI")
    app.config["MONGO_DB_NAME"] = os.getenv("MONGO_DB_NAME", app.config.get("MONGO_DB_NAME", "test"))
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET", app.config.get("JWT_SECRET_KEY"))
    app.config["PORT"] = int(os.getenv("PORT", str(app.config.get("PORT", 5000))))
    app.config["CORS_ORIGINS"] = [
        o.strip()
        for o in os.getenv(
            "CORS_ORIGINS",
            ",".join(app.config.get("CORS_ORIGINS", [])),
        ).split(",")
        if o.strip()
    ]

    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(minutes=app.config["JWT_ACCESS_TOKEN_EXPIRES_MINUTES"])
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=app.config["JWT_REFRESH_TOKEN_EXPIRES_DAYS"])

    upload_dir = Path(app.root_path) / app.config["UPLOAD_FOLDER"]
    upload_dir.mkdir(parents=True, exist_ok=True)

    CORS(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=True,
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    )

    jwt = JWTManager(app)
    register_auth_handlers(jwt)
    init_mongo(app)

    app.before_request(attach_request_context)
    app.before_request(audit_mutating_request)

    @app.after_request
    def emit_mutation_events(response):
        if request.path.startswith("/api/") and request.method in {"POST", "PUT", "PATCH", "DELETE"} and response.status_code < 400:
            publish_event(
                "airms:data-changed",
                {"url": request.path, "method": request.method, "statusCode": response.status_code},
            )
        return response

    @app.get("/uploads/<path:filename>")
    def uploads(filename: str):
        return send_from_directory(upload_dir, filename)

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "service": "airms-flask"})

    app.register_blueprint(events_blueprint, url_prefix="/api/events")
    register_blueprints(app)
    app.register_blueprint(ai_insights_bp, url_prefix="/api/ai-insights")
    app.register_blueprint(legacy_api_bp)
    # app.register_blueprint(web_blueprint)

    # @app.get("/")
    # def web_root():
    #     return redirect(url_for("web.login"))

    # @app.get("/dashboard")
    # def dashboard_root():
    #     return redirect("/web/dashboard/maintenance-dashboard")

    @app.errorhandler(Exception)
    def handle_error(err):
        code = getattr(err, "code", 500)
        return jsonify({"status": "error", "message": str(err)}), code

    return app
