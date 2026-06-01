from flask import jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request


def register_auth_handlers(jwt):
    @jwt.unauthorized_loader
    def _unauthorized(reason):
        return jsonify({"message": "No token provided", "detail": reason}), 401

    @jwt.invalid_token_loader
    def _invalid(reason):
        return jsonify({"message": "Invalid or expired token", "detail": reason}), 401


def jwt_required_fn():
    verify_jwt_in_request()
    return get_jwt_identity(), get_jwt()


def require_role(*roles):
    normalized = {str(r).strip().lower() for r in roles}

    def guard():
        identity, claims = jwt_required_fn()
        role = str(claims.get("role") or "").strip().lower()
        if role not in normalized:
            return jsonify({"message": "Forbidden", "identity": identity}), 403
        return None

    return guard
