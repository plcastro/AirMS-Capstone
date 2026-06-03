from datetime import datetime
import random
import string

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required
import bcrypt
import hashlib
import logging
import re
from werkzeug.security import check_password_hash, generate_password_hash

from middleware.auth import jwt_required_fn
from services.mongo import get_db
from utils.mongo_helpers import parse_object_id, to_jsonable

blueprint = Blueprint("user", __name__)
logger = logging.getLogger(__name__)


def _users_collection():
    return get_db()["users"]


def _random_otp():
    return f"{random.randrange(0, 1000000):06d}"


def _verify_password(raw_password, stored_hash):
    if not stored_hash:
        return False
    raw = str(raw_password or "")
    hashed = str(stored_hash or "")

    # Legacy Node users use bcrypt ($2a/$2b/$2y...).
    if hashed.startswith("$2"):
        try:
            return bcrypt.checkpw(raw.encode("utf-8"), hashed.encode("utf-8"))
        except Exception:
            return False

    # Flask-created users use Werkzeug hashes.
    try:
        return check_password_hash(hashed, raw)
    except Exception:
        pass

    # Legacy hashes (common in old systems): md5/sha1/sha256 hex.
    if len(hashed) in {32, 40, 64} and all(c in "0123456789abcdefABCDEF" for c in hashed):
        lowered = hashed.lower()
        if len(lowered) == 32 and hashlib.md5(raw.encode("utf-8")).hexdigest() == lowered:
            return True
        if len(lowered) == 40 and hashlib.sha1(raw.encode("utf-8")).hexdigest() == lowered:
            return True
        if len(lowered) == 64 and hashlib.sha256(raw.encode("utf-8")).hexdigest() == lowered:
            return True

    # Last-resort fallback for plain-text test records.
    return hashed == raw


@blueprint.post("/login")
def login():
    body = request.get_json(silent=True) or {}
    identifier = str(body.get("identifier") or body.get("username") or body.get("email") or "").strip()
    password = str(body.get("password") or "").strip()
    base = str(request.headers.get("x-base") or body.get("base") or "").strip()
    remember_me = bool(body.get("rememberMe"))
    if not identifier or not password:
        logger.warning("[LOGIN_FAIL] reason=missing_credentials identifier=%r base=%r", identifier, base)
        return jsonify({"message": "Username/email and password required"}), 400
    if not base:
        logger.warning("[LOGIN_FAIL] reason=missing_base identifier=%r", identifier)
        return jsonify({"message": "Please select where you are logging in from"}), 400

    normalized_identifier = " ".join(identifier.split()).strip()
    escaped = re.escape(normalized_identifier)
    user = _users_collection().find_one(
        {
            "$or": [
                {"username": {"$regex": f"^{escaped}$", "$options": "i"}},
                {"email": {"$regex": f"^{escaped}$", "$options": "i"}},
            ]
        }
    )
    if not user:
        logger.warning(
            "[LOGIN_FAIL] reason=user_not_found identifier=%r normalized_identifier=%r base=%r",
            identifier,
            normalized_identifier,
            base,
        )
        return jsonify({"message": "Account does not exist"}), 401

    hash_value = user.get("password") or user.get("passwordHash")
    verified = _verify_password(password, hash_value)
    if not verified:
        hash_kind = "none"
        if isinstance(hash_value, str):
            if hash_value.startswith("$2"):
                hash_kind = "bcrypt"
            elif hash_value.startswith("pbkdf2:"):
                hash_kind = "werkzeug_pbkdf2"
            elif len(hash_value) in {32, 40, 64}:
                hash_kind = f"hex_{len(hash_value)}"
            else:
                hash_kind = "other_string"
        logger.warning(
            "[LOGIN_FAIL] reason=hash_mismatch identifier=%r user_id=%r base=%r hash_kind=%s hash_preview=%r",
            identifier,
            str(user.get("_id")),
            base,
            hash_kind,
            str(hash_value)[:8] if hash_value is not None else None,
        )
        return jsonify({"message": "Invalid username/email or password"}), 401
    logger.info(
        "[LOGIN_OK] identifier=%r user_id=%r base=%r role=%r",
        identifier,
        str(user.get("_id")),
        base,
        str(user.get("jobTitle") or user.get("role") or "mechanic"),
    )

    role = str(user.get("jobTitle") or user.get("role") or "mechanic").strip().lower()
    session_id = body.get("sessionId") or f"flask-{datetime.utcnow().timestamp()}"
    claims = {"role": role, "sessionId": session_id, "base": base}
    access_token = create_access_token(identity=str(user["_id"]), additional_claims=claims)
    refresh_token = create_refresh_token(identity=str(user["_id"]), additional_claims=claims)
    return jsonify(
        {
            "message": "Login successful",
            "token": access_token,
            "refreshToken": refresh_token if remember_me else None,
            "sessionId": session_id,
            "user": {
                "id": str(user["_id"]),
                "username": user.get("username"),
                "email": user.get("email"),
                "firstName": user.get("firstName"),
                "lastName": user.get("lastName"),
                "jobTitle": user.get("jobTitle") or role,
                "access": user.get("access"),
                "status": user.get("status") or ("active" if user.get("isActive", True) else "inactive"),
                "image": user.get("image"),
                "signature": user.get("signature"),
                "securitySetupCompleted": user.get("securitySetupCompleted", True),
                "isOnline": True,
                "platform": "web",
                "base": base,
                "sessionId": session_id,
            },
        }
    )


@blueprint.post("/refresh-token")
@jwt_required(refresh=True)
def refresh_token():
    identity, claims = jwt_required_fn()
    token = create_access_token(identity=identity, additional_claims={"role": claims.get("role"), "sessionId": claims.get("sessionId")})
    return jsonify({"token": token})


@blueprint.post("/logout")
@jwt_required(optional=True)
def logout():
    return jsonify({"message": "Logged out"})


@blueprint.post("/request-password-reset")
def request_password_reset():
    body = request.get_json(silent=True) or {}
    email = str(body.get("email") or "").strip()
    if not email:
        return jsonify({"message": "Email is required"}), 400
    otp = _random_otp()
    result = _users_collection().update_one(
        {"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}},
        {"$set": {"resetOtp": otp, "resetOtpCreatedAt": datetime.utcnow()}},
    )
    if result.matched_count == 0:
        return jsonify({"message": "Account not found"}), 404
    return jsonify({"message": "Reset code generated", "otp": otp})


@blueprint.post("/verify-otp")
def verify_otp():
    body = request.get_json(silent=True) or {}
    email = str(body.get("email") or "").strip()
    otp = str(body.get("otp") or "").strip()
    user = _users_collection().find_one({"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}})
    if not user or str(user.get("resetOtp") or user.get("otp") or "") != otp:
        return jsonify({"message": "Invalid verification code"}), 400
    return jsonify({"message": "Verification successful"})


@blueprint.post("/reset-password")
def reset_password():
    body = request.get_json(silent=True) or {}
    email = str(body.get("email") or "").strip()
    otp = str(body.get("otp") or "").strip()
    password = str(body.get("password") or "").strip()
    if not email or not otp or not password:
        return jsonify({"message": "Email, code, and password are required"}), 400
    user = _users_collection().find_one({"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}})
    if not user or str(user.get("resetOtp") or user.get("otp") or "") != otp:
        return jsonify({"message": "Invalid reset code"}), 400
    _users_collection().update_one(
        {"_id": user["_id"]},
        {"$set": {"passwordHash": generate_password_hash(password), "updatedAt": datetime.utcnow()}, "$unset": {"resetOtp": "", "otp": ""}},
    )
    return jsonify({"message": "Password reset successful"})


@blueprint.post("/activate")
def activate_user():
    body = request.get_json(silent=True) or {}
    email = str(body.get("email") or "").strip()
    password = str(body.get("password") or "").strip()
    pin = str(body.get("pin") or "").strip()
    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400
    updates = {
        "passwordHash": generate_password_hash(password),
        "securitySetupCompleted": True,
        "status": "active",
        "isActive": True,
        "updatedAt": datetime.utcnow(),
    }
    if pin:
        updates["pinHash"] = generate_password_hash(pin)
    result = _users_collection().update_one(
        {"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}},
        {"$set": updates, "$unset": {"activationOtp": "", "otp": ""}},
    )
    if result.matched_count == 0:
        return jsonify({"message": "Account not found"}), 404
    return jsonify({"message": "Account activated successfully"})


@blueprint.put("/session-preference")
@jwt_required()
def session_preference():
    return jsonify({"message": "Session preference updated"})


@blueprint.get("/username-exists")
def username_exists():
    username = request.args.get("username", "")
    exists = _users_collection().find_one({"username": username}) is not None
    return jsonify({"exists": exists})


@blueprint.get("/get-all-users")
@jwt_required()
def get_all_users():
    users = list(_users_collection().find({}, {"password": 0, "passwordHash": 0}))
    return jsonify(to_jsonable(users))


@blueprint.get("/assignable-users")
@jwt_required()
def assignable_users():
    query = {
        "$or": [
            {"jobTitle": {"$regex": "mechanic|maintenance manager|officer-in-charge", "$options": "i"}},
            {"role": {"$regex": "mechanic|maintenance manager|officer-in-charge", "$options": "i"}},
        ]
    }
    users = list(_users_collection().find(query, {"password": 0, "passwordHash": 0}))
    return jsonify(to_jsonable(users))


@blueprint.post("/create")
@jwt_required()
def create_user():
    body = request.get_json(silent=True) or {}
    role = body.get("role") or body.get("jobTitle") or body.get("access")
    required = ["username", "password"]
    missing = [key for key in required if not body.get(key)]
    if not role:
        missing.append("role")
    if missing:
        return jsonify({"message": f"Missing fields: {', '.join(missing)}"}), 400

    if _users_collection().find_one({"username": body["username"]}):
        return jsonify({"message": "Username already exists"}), 409

    normalized_role = str(role).strip().lower()
    doc = {
        "username": body["username"],
        "name": body.get("name"),
        "firstName": body.get("firstName"),
        "lastName": body.get("lastName"),
        "email": body.get("email"),
        "role": normalized_role,
        "jobTitle": normalized_role,
        "status": body.get("status") or "active",
        "passwordHash": generate_password_hash(body["password"]),
        "isActive": True,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }
    result = _users_collection().insert_one(doc)
    doc["_id"] = result.inserted_id
    doc.pop("passwordHash", None)
    return jsonify(to_jsonable(doc)), 201


@blueprint.put("/update-user/<id>")
@jwt_required()
def update_user(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400

    body = request.get_json(silent=True) or {}
    updates = {k: v for k, v in body.items() if k in {"name", "firstName", "lastName", "email", "role", "jobTitle", "access", "status", "isActive"}}
    if "jobTitle" in updates and "role" not in updates:
        updates["role"] = str(updates["jobTitle"]).strip().lower()
    if "password" in body and body["password"]:
        updates["passwordHash"] = generate_password_hash(body["password"])
    updates["updatedAt"] = datetime.utcnow()

    result = _users_collection().update_one({"_id": oid}, {"$set": updates})
    if result.matched_count == 0:
        return jsonify({"message": "User not found"}), 404
    user = _users_collection().find_one({"_id": oid}, {"password": 0, "passwordHash": 0})
    return jsonify(to_jsonable(user))


@blueprint.put("/update-user-status/<id>")
@jwt_required()
def update_user_status(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400
    body = request.get_json(silent=True) or {}
    status = str(body.get("status") or "").strip().lower()
    if status not in {"active", "inactive", "deactivated"}:
        return jsonify({"message": "Invalid status"}), 400
    result = _users_collection().update_one(
        {"_id": oid},
        {"$set": {"status": status, "isActive": status == "active", "updatedAt": datetime.utcnow()}},
    )
    if result.matched_count == 0:
        return jsonify({"message": "User not found"}), 404
    return jsonify({"message": "Status updated"})


@blueprint.put("/update-user-profile/<id>")
@jwt_required()
def update_user_profile(id):
    return update_user(id)


@blueprint.put("/change-password/<id>")
@jwt_required()
def change_password(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400
    body = request.get_json(silent=True) or {}
    password = body.get("password")
    if not password:
        return jsonify({"message": "password is required"}), 400

    result = _users_collection().update_one({"_id": oid}, {"$set": {"passwordHash": generate_password_hash(password), "updatedAt": datetime.utcnow()}})
    if result.matched_count == 0:
        return jsonify({"message": "User not found"}), 404
    return jsonify({"message": "Password updated"})


@blueprint.get("/me")
@jwt_required()
def me():
    identity, claims = jwt_required_fn()
    oid = parse_object_id(identity)
    user = _users_collection().find_one({"_id": oid}, {"password": 0, "passwordHash": 0}) if oid else None
    if user:
        user = to_jsonable(user)
        user["role"] = claims.get("role")
        return jsonify(user)
    return jsonify({"id": identity, "role": claims.get("role")})
