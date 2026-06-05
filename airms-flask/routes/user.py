from datetime import datetime, timedelta
import random
import secrets
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
from storage import save_upload
from utils.mongo_helpers import parse_object_id, to_jsonable

blueprint = Blueprint("user", __name__)
logger = logging.getLogger(__name__)


def _users_collection():
    return get_db()["users"]


def _random_otp():
    return f"{random.randrange(0, 1000000):06d}"


def _random_temp_password(length=10):
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _role_for_job(job_title):
    role_map = {
        "superadmin": "Superadmin",
        "pilot": "User",
        "maintenance manager": "Superuser",
        "officer-in-charge": "Superuser",
        "mechanic": "User",
        "warehouse department": "User",
    }
    return role_map.get(str(job_title or "").strip().lower(), "")


def _public_user(user):
    data = to_jsonable(user or {})
    data.pop("password", None)
    data.pop("passwordHash", None)
    data.pop("pin", None)
    data.pop("pinHash", None)
    if data.get("_id") and not data.get("id"):
        data["id"] = data["_id"]
    return data


def _request_data():
    return request.form if request.form else (request.get_json(silent=True) or {})


def _mask_email(email=""):
    parts = str(email or "").split("@")
    if len(parts) != 2:
        return email
    local, domain = parts
    if len(local) <= 2:
        return f"{local[:1]}*@{domain}"
    return f"{local[0]}{'*' * (len(local) - 2)}{local[-1]}@{domain}"


def _trusted_device_matches(user, token):
    token = str(token or "").strip()
    if not token:
        return False
    return token in set(user.get("trustedDeviceTokens") or [])


def _serialize_login_user(user, role, base, session_id):
    return {
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
    }


def _issue_login_payload(user, base, remember_me, session_id=None):
    role = str(user.get("jobTitle") or user.get("role") or "mechanic").strip().lower()
    session_id = session_id or f"flask-{datetime.utcnow().timestamp()}"
    claims = {"role": role, "sessionId": session_id, "base": base}
    access_token = create_access_token(identity=str(user["_id"]), additional_claims=claims)
    refresh_token = create_refresh_token(identity=str(user["_id"]), additional_claims=claims)
    return {
        "message": "Login successful",
        "token": access_token,
        "refreshToken": refresh_token if remember_me else None,
        "sessionId": session_id,
        "user": _serialize_login_user(user, role, base, session_id),
    }


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
    trusted_device_token = str(body.get("trustedDeviceToken") or request.headers.get("x-trusted-device-token") or "").strip()
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
    if not user.get("securitySetupCompleted", True):
        return jsonify(
            {
                "requireSetup": True,
                "message": "Security setup required",
                "user": {
                    "email": user.get("email"),
                    "setupToken": str(user.get("setupToken") or secrets.token_urlsafe(24)),
                },
            }
        )

    if (user.get("loginOtpEnabled") or user.get("twoFactorEnabled")) and not _trusted_device_matches(user, trusted_device_token):
        otp = _random_otp()
        verification_token = secrets.token_urlsafe(24)
        _users_collection().update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "loginOtp": otp,
                    "loginOtpToken": verification_token,
                    "loginOtpCreatedAt": datetime.utcnow(),
                    "pendingLogin": {
                        "base": base,
                        "rememberMe": remember_me,
                        "sessionId": body.get("sessionId"),
                    },
                }
            },
        )
        return jsonify(
            {
                "requireLoginOtp": True,
                "message": "Login verification required",
                "verification": {
                    "token": verification_token,
                    "email": user.get("email"),
                    "maskedEmail": _mask_email(user.get("email")),
                    "otp": otp,
                },
            }
        )

    session_id = body.get("sessionId") or f"flask-{datetime.utcnow().timestamp()}"
    return jsonify(_issue_login_payload(user, base, remember_me, session_id))


@blueprint.post("/login/verify-otp")
def verify_login_otp():
    body = request.get_json(silent=True) or {}
    token = str(body.get("token") or "").strip()
    otp = str(body.get("otp") or "").strip()
    user = _users_collection().find_one({"loginOtpToken": token}) if token else None
    if not user or str(user.get("loginOtp") or "") != otp:
        return jsonify({"message": "Invalid verification code"}), 400

    pending = user.get("pendingLogin") or {}
    remember_me = bool(body.get("rememberMe", pending.get("rememberMe")))
    base = str(body.get("base") or pending.get("base") or "UNKNOWN").strip()
    session_id = pending.get("sessionId") or body.get("sessionId")
    payload = _issue_login_payload(user, base, remember_me, session_id)

    if body.get("trustDevice") or body.get("trustedDeviceLabel"):
        trusted_token = secrets.token_urlsafe(32)
        _users_collection().update_one(
            {"_id": user["_id"]},
            {
                "$addToSet": {"trustedDeviceTokens": trusted_token},
                "$unset": {"loginOtp": "", "loginOtpToken": "", "pendingLogin": ""},
            },
        )
        payload["trustedDeviceToken"] = trusted_token
    else:
        _users_collection().update_one({"_id": user["_id"]}, {"$unset": {"loginOtp": "", "loginOtpToken": "", "pendingLogin": ""}})
    return jsonify(payload)


@blueprint.post("/login/resend-otp")
def resend_login_otp():
    body = request.get_json(silent=True) or {}
    token = str(body.get("token") or "").strip()
    user = _users_collection().find_one({"loginOtpToken": token}) if token else None
    if not user:
        return jsonify({"message": "Verification session not found"}), 404
    otp = _random_otp()
    _users_collection().update_one(
        {"_id": user["_id"]},
        {"$set": {"loginOtp": otp, "loginOtpCreatedAt": datetime.utcnow()}},
    )
    return jsonify({"message": "Verification code resent", "otp": otp})


@blueprint.post("/refresh-token")
@jwt_required(refresh=True)
def refresh_token():
    identity, claims = jwt_required_fn()
    token = create_access_token(
        identity=identity,
        additional_claims={
            "role": claims.get("role"),
            "sessionId": claims.get("sessionId"),
            "base": claims.get("base"),
        },
    )
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
    return jsonify({"success": True, "data": [_public_user(user) for user in users]})


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
    return jsonify({"success": True, "data": [_public_user(user) for user in users]})


@blueprint.post("/create")
@jwt_required()
def create_user():
    body = _request_data()
    first_name = str(body.get("firstName") or "").strip()
    last_name = str(body.get("lastName") or "").strip()
    email = str(body.get("email") or "").strip()
    username = str(body.get("username") or "").strip()
    job_title = str(body.get("jobTitle") or body.get("role") or "").strip()
    access = str(body.get("access") or _role_for_job(job_title) or "").strip()
    password = str(body.get("password") or "").strip() or _random_temp_password()
    missing = [label for label, value in {
        "firstName": first_name,
        "lastName": last_name,
        "email": email,
        "username": username,
        "jobTitle": job_title,
    }.items() if not value]
    if missing:
        return jsonify({"message": f"Missing fields: {', '.join(missing)}"}), 400

    if _users_collection().find_one({"$or": [{"username": username}, {"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}}]}):
        return jsonify({"message": "User with same email or username already exists"}), 409

    expires_at = datetime.utcnow() + timedelta(hours=1)
    image = ""
    if request.files.get("image"):
        filename, _ = save_upload(request.files["image"])
        image = f"/uploads/{filename}"
    signature = str(body.get("signature") or "").strip()
    if request.files.get("signature"):
        filename, _ = save_upload(request.files["signature"])
        signature = f"/uploads/{filename}"

    doc = {
        "username": username,
        "name": f"{first_name} {last_name}".strip(),
        "firstName": first_name,
        "lastName": last_name,
        "email": email,
        "role": job_title.lower(),
        "jobTitle": job_title,
        "access": access,
        "base": str(body.get("base") or request.headers.get("x-base") or "").strip().upper(),
        "licenseNo": str(body.get("licenseNo") or "").strip(),
        "status": str(body.get("status") or "inactive").strip().lower(),
        "passwordHash": generate_password_hash(password),
        "pinHash": "",
        "securitySetupCompleted": False,
        "isActive": False,
        "image": image,
        "signature": signature,
        "dateCreated": body.get("dateCreated") or datetime.utcnow(),
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
        "lastLogin": None,
        "invitationStatus": "pending",
        "invitationSentAt": datetime.utcnow(),
        "invitationExpiresAt": expires_at,
        "invitationClaimedAt": None,
        "tempPasswordExpires": expires_at,
    }
    result = _users_collection().insert_one(doc)
    created = _users_collection().find_one({"_id": result.inserted_id})
    return jsonify({"message": "User created successfully", "user": _public_user(created), "data": _public_user(created), "tempPassword": password}), 201


@blueprint.put("/update-user/<id>")
@jwt_required()
def update_user(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400

    body = _request_data()
    updates = {k: v for k, v in body.items() if k in {"name", "firstName", "lastName", "email", "username", "role", "jobTitle", "access", "status", "isActive", "base", "licenseNo", "dateCreated", "signature"}}
    if request.files.get("image"):
        filename, _ = save_upload(request.files["image"])
        updates["image"] = f"/uploads/{filename}"
    if request.files.get("signature"):
        filename, _ = save_upload(request.files["signature"])
        updates["signature"] = f"/uploads/{filename}"
    if "firstName" in updates or "lastName" in updates:
        first_name = str(updates.get("firstName") or body.get("firstName") or "").strip()
        last_name = str(updates.get("lastName") or body.get("lastName") or "").strip()
        if first_name or last_name:
            updates["name"] = f"{first_name} {last_name}".strip()
    if "jobTitle" in updates and "role" not in updates:
        updates["role"] = str(updates["jobTitle"]).strip().lower()
    if "jobTitle" in updates and not updates.get("access"):
        updates["access"] = _role_for_job(updates["jobTitle"])
    if "password" in body and body["password"]:
        updates["passwordHash"] = generate_password_hash(body["password"])
    updates["updatedAt"] = datetime.utcnow()

    result = _users_collection().update_one({"_id": oid}, {"$set": updates})
    if result.matched_count == 0:
        return jsonify({"message": "User not found"}), 404
    user = _users_collection().find_one({"_id": oid}, {"password": 0, "passwordHash": 0})
    return jsonify({"message": "User updated successfully", "user": _public_user(user), "data": _public_user(user)})


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


@blueprint.post("/resend-activation/<id>")
@jwt_required()
def resend_activation(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400
    temp_password = _random_temp_password()
    expires_at = datetime.utcnow() + timedelta(hours=1)
    result = _users_collection().update_one(
        {"_id": oid},
        {
            "$set": {
                "passwordHash": generate_password_hash(temp_password),
                "securitySetupCompleted": False,
                "status": "inactive",
                "isActive": False,
                "invitationStatus": "pending",
                "invitationSentAt": datetime.utcnow(),
                "invitationExpiresAt": expires_at,
                "tempPasswordExpires": expires_at,
                "updatedAt": datetime.utcnow(),
            }
        },
    )
    if result.matched_count == 0:
        return jsonify({"message": "User not found"}), 404
    return jsonify({"message": "Invitation resent", "tempPassword": temp_password})


@blueprint.put("/extend-invitation-expiry/<id>")
@jwt_required()
def extend_invitation_expiry(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400
    body = request.get_json(silent=True) or {}
    hours = int(body.get("hours") or 24)
    expires_at = datetime.utcnow() + timedelta(hours=hours)
    result = _users_collection().update_one(
        {"_id": oid},
        {"$set": {"invitationStatus": "pending", "invitationExpiresAt": expires_at, "tempPasswordExpires": expires_at, "updatedAt": datetime.utcnow()}},
    )
    if result.matched_count == 0:
        return jsonify({"message": "User not found"}), 404
    return jsonify({"message": "Invitation expiry extended", "invitationExpiresAt": expires_at.isoformat()})


@blueprint.put("/revoke-invitation/<id>")
@jwt_required()
def revoke_invitation(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400
    result = _users_collection().update_one(
        {"_id": oid},
        {"$set": {"invitationStatus": "revoked", "status": "inactive", "isActive": False, "updatedAt": datetime.utcnow()}},
    )
    if result.matched_count == 0:
        return jsonify({"message": "User not found"}), 404
    return jsonify({"message": "Invitation revoked"})


@blueprint.put("/update-user-profile/<id>")
@jwt_required()
def update_user_profile(id):
    return update_user(id)


@blueprint.put("/update-user-image/<id>")
@jwt_required()
def update_user_image(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400
    image = ""
    if request.files.get("image"):
        filename, _ = save_upload(request.files["image"])
        image = f"/uploads/{filename}"
    else:
        body = request.get_json(silent=True) or {}
        image = str(body.get("image") or "").strip()
    result = _users_collection().update_one({"_id": oid}, {"$set": {"image": image, "updatedAt": datetime.utcnow()}})
    if result.matched_count == 0:
        return jsonify({"message": "User not found"}), 404
    user = _users_collection().find_one({"_id": oid}, {"password": 0, "passwordHash": 0})
    return jsonify({"message": "Avatar updated", "user": _public_user(user)})


@blueprint.delete("/update-user-image/<id>")
@jwt_required()
def remove_user_image(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400
    result = _users_collection().update_one({"_id": oid}, {"$set": {"image": "", "updatedAt": datetime.utcnow()}})
    if result.matched_count == 0:
        return jsonify({"message": "User not found"}), 404
    user = _users_collection().find_one({"_id": oid}, {"password": 0, "passwordHash": 0})
    return jsonify({"message": "Avatar removed", "user": _public_user(user)})


@blueprint.put("/updateSignature/<id>")
@jwt_required()
def update_signature(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400

    user = _users_collection().find_one({"_id": oid})
    if not user:
        return jsonify({"message": "User not found"}), 404
    if user.get("signature"):
        return jsonify({"message": "Signature specimen has already been uploaded."}), 400

    body = _request_data()
    signature = str(body.get("signature") or "").strip()
    if request.files.get("signature"):
        filename, _ = save_upload(request.files["signature"])
        signature = f"/uploads/{filename}"
    if not signature:
        return jsonify({"message": "Signature is required"}), 400

    _users_collection().update_one(
        {"_id": oid},
        {"$set": {"signature": signature, "updatedAt": datetime.utcnow()}},
    )
    updated = _users_collection().find_one({"_id": oid}, {"password": 0, "passwordHash": 0, "pin": 0, "pinHash": 0})
    return jsonify({"message": "Signature updated", "user": _public_user(updated), "data": _public_user(updated)})


@blueprint.put("/change-password/<id>")
@jwt_required()
def change_password(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400
    body = request.get_json(silent=True) or {}
    current_password = str(body.get("currentPassword") or "").strip()
    password = str(body.get("newPassword") or body.get("password") or "").strip()
    if not password:
        return jsonify({"message": "New password is required"}), 400
    user = _users_collection().find_one({"_id": oid})
    if not user:
        return jsonify({"message": "User not found"}), 404
    if current_password and not _verify_password(current_password, user.get("password") or user.get("passwordHash")):
        return jsonify({"message": "Current password is incorrect"}), 401

    result = _users_collection().update_one({"_id": oid}, {"$set": {"passwordHash": generate_password_hash(password), "updatedAt": datetime.utcnow()}})
    if result.matched_count == 0:
        return jsonify({"message": "User not found"}), 404
    return jsonify({"message": "Password updated"})


@blueprint.put("/update-pin/<id>")
@jwt_required()
def update_pin(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400
    body = request.get_json(silent=True) or {}
    current_pin = str(body.get("currentPin") or "").strip()
    new_pin = str(body.get("newPin") or body.get("pin") or "").strip()
    if not re.fullmatch(r"\d{6}", new_pin):
        return jsonify({"message": "New PIN must be 6 digits"}), 400
    user = _users_collection().find_one({"_id": oid})
    if not user:
        return jsonify({"message": "User not found"}), 404
    existing_pin = user.get("pinHash") or user.get("pin")
    if existing_pin and current_pin and not _verify_password(current_pin, existing_pin):
        return jsonify({"message": "Current PIN is incorrect"}), 401
    if existing_pin and _verify_password(new_pin, existing_pin):
        return jsonify({"message": "Cannot reuse the same PIN"}), 400
    _users_collection().update_one({"_id": oid}, {"$set": {"pinHash": generate_password_hash(new_pin), "updatedAt": datetime.utcnow()}})
    return jsonify({"message": "PIN updated"})


@blueprint.post("/verify-pin/<id>")
@jwt_required()
def verify_pin(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400
    body = request.get_json(silent=True) or {}
    pin = str(body.get("pin") or "").strip()
    user = _users_collection().find_one({"_id": oid})
    if not user:
        return jsonify({"message": "User not found"}), 404
    if not _verify_password(pin, user.get("pinHash") or user.get("pin")):
        return jsonify({"message": "PIN is incorrect"}), 401
    return jsonify({"message": "PIN verified"})


@blueprint.post("/request-pin-reset/<id>")
@jwt_required()
def request_pin_reset(id):
    oid = parse_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid id"}), 400
    body = request.get_json(silent=True) or {}
    current_password = str(body.get("currentPassword") or "").strip()
    user = _users_collection().find_one({"_id": oid})
    if not user:
        return jsonify({"message": "User not found"}), 404
    if not _verify_password(current_password, user.get("password") or user.get("passwordHash")):
        return jsonify({"message": "Current password is incorrect"}), 401
    token = secrets.token_urlsafe(24)
    otp = _random_otp()
    _users_collection().update_one(
        {"_id": oid},
        {"$set": {"pinResetToken": token, "pinResetOtp": otp, "pinResetCreatedAt": datetime.utcnow()}},
    )
    return jsonify({"message": "Verification OTP sent to your email", "token": token, "otp": otp})


@blueprint.post("/verify-pin-otp")
@jwt_required()
def verify_pin_otp():
    body = request.get_json(silent=True) or {}
    token = str(body.get("token") or "").strip()
    otp = str(body.get("otp") or "").strip()
    user = _users_collection().find_one({"pinResetToken": token}) if token else None
    if not user or str(user.get("pinResetOtp") or "") != otp:
        return jsonify({"message": "Invalid verification code"}), 400
    _users_collection().update_one({"_id": user["_id"]}, {"$set": {"pinResetVerified": True}})
    return jsonify({"message": "OTP verified"})


@blueprint.post("/reset-pin")
@jwt_required()
def reset_pin():
    body = request.get_json(silent=True) or {}
    token = str(body.get("token") or "").strip()
    new_pin = str(body.get("newPin") or body.get("pin") or "").strip()
    if not re.fullmatch(r"\d{6}", new_pin):
        return jsonify({"message": "New PIN must be 6 digits"}), 400
    user = _users_collection().find_one({"pinResetToken": token, "pinResetVerified": True}) if token else None
    if not user:
        return jsonify({"message": "PIN reset session not verified"}), 400
    _users_collection().update_one(
        {"_id": user["_id"]},
        {
            "$set": {"pinHash": generate_password_hash(new_pin), "updatedAt": datetime.utcnow()},
            "$unset": {"pinResetToken": "", "pinResetOtp": "", "pinResetVerified": "", "pinResetCreatedAt": ""},
        },
    )
    return jsonify({"message": "PIN reset successfully"})


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
