from flask import Blueprint, jsonify, request

legacy_api_bp = Blueprint("legacy_api", __name__)

# Mirrors existing Express prefixes (except AI summaries, explicitly disabled).
MIRRORED_PREFIXES = [
    "user",
    "logs",
    "admin-activity",
    "admin-security-alerts",
    "parts-monitoring",
    "parts-requisition",
    "requisitions",
    "maintenance-logs",
    "approve-technical-logs",
    "aircraft",
    "tasks",
    "inspections",
    "pre-inspections",
    "post-inspections",
    "notifications",
    "messages",
    "flightlogs",
]


@legacy_api_bp.get("/api/events/stream")
def events_stream_stub():
    return jsonify({
        "ok": True,
        "message": "SSE stream stub in Flask migration."
    })


@legacy_api_bp.route("/api/ai-insights", defaults={"subpath": ""}, methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
@legacy_api_bp.route("/api/ai-insights/<path:subpath>", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
def ai_disabled(subpath: str):
    return jsonify({
        "ok": False,
        "disabled": True,
        "message": "AI summaries/insights are intentionally disabled in this Flask replica.",
        "path": f"/api/ai-insights/{subpath}" if subpath else "/api/ai-insights",
    }), 410


def _register_prefix(prefix: str) -> None:
    base = f"/api/{prefix}"

    def handler(subpath: str = ""):
        return jsonify({
            "ok": True,
            "migration": "in-progress",
            "prefix": prefix,
            "method": request.method,
            "path": f"{base}/{subpath}" if subpath else base,
            "message": "Endpoint surface mirrored; business logic migration to Flask pending.",
        })

    endpoint_base = f"{prefix}_base"
    endpoint_sub = f"{prefix}_sub"

    legacy_api_bp.add_url_rule(base, endpoint_base, handler, methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
    legacy_api_bp.add_url_rule(f"{base}/<path:subpath>", endpoint_sub, handler, methods=["GET", "POST", "PUT", "PATCH", "DELETE"])


for p in MIRRORED_PREFIXES:
    _register_prefix(p)
