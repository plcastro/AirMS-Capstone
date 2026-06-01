import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
import random
import string
from pathlib import Path

import bcrypt
import jwt
from bson import ObjectId
from flask import Blueprint, jsonify, make_response, request
from pymongo import ReturnDocument
from werkzeug.utils import secure_filename

try:
    from db import get_db
    from email_utils import send_login_otp_email, send_password_reset_otp_email
except ImportError:
    import sys
    from pathlib import Path
    sys.path.append(str(Path(__file__).resolve().parents[1]))
    from db import get_db
    from email_utils import send_login_otp_email, send_password_reset_otp_email

user_bp = Blueprint("user_api", __name__, url_prefix="/api/user")

ACCESS_TOKEN_MINUTES = 15
REFRESH_TOKEN_DAYS = 7
REFRESH_TOKEN_DAYS_REMEMBER = 30
TRUSTED_DEVICE_DAYS = 30
OTP_EXPIRY_MINUTES = 10


def _utcnow():
    return datetime.now(timezone.utc)


def _to_object_id(value: str):
    try:
        return ObjectId(value)
    except Exception:
        return None


def _serialize_user(user_doc, base="UNKNOWN", session_id=None):
    return {
        "id": str(user_doc.get("_id")),
        "username": user_doc.get("username"),
        "email": user_doc.get("email"),
        "firstName": user_doc.get("firstName"),
        "lastName": user_doc.get("lastName"),
        "jobTitle": user_doc.get("jobTitle"),
        "access": user_doc.get("access"),
        "status": user_doc.get("status"),
        "image": user_doc.get("image", ""),
        "signature": user_doc.get("signature", ""),
        "securitySetupCompleted": bool(user_doc.get("securitySetupCompleted", False)),
        "lastLogin": user_doc.get("lastLogin").isoformat() if user_doc.get("lastLogin") else None,
        "isOnline": bool(user_doc.get("isOnline", False)),
        "platform": user_doc.get("platform", "web"),
        "base": base,
        "sessionId": session_id,
        "lastSeenAt": user_doc.get("lastSeenAt").isoformat() if user_doc.get("lastSeenAt") else None,
    }


def _mask_email(email=""):
    parts = str(email).split("@")
    if len(parts) != 2:
        return email
    local, domain = parts
    if len(local) <= 2:
        return f"{local[:1]}*@{domain}"
    return f"{local[0]}{'*' * (len(local) - 2)}{local[-1]}@{domain}"


def _jwt_secret(name, fallback):
    return os.getenv(name) or fallback


def _issue_access_token(user_doc, session_id, platform, base):
    payload = {
        "id": str(user_doc.get("_id")),
        "username": user_doc.get("username"),
        "email": user_doc.get("email"),
        "jobTitle": user_doc.get("jobTitle"),
        "access": user_doc.get("access"),
        "sessionId": session_id,
        "platform": platform,
        "base": base,
        "exp": _utcnow() + timedelta(minutes=ACCESS_TOKEN_MINUTES),
        "iat": _utcnow(),
    }
    return jwt.encode(payload, _jwt_secret("JWT_SECRET", "dev-jwt-secret"), algorithm="HS256")


def _hash_refresh_token(token: str):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _hash_trusted_token(token: str):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _issue_refresh_token(user_id: str, persistent: bool):
    days = REFRESH_TOKEN_DAYS_REMEMBER if persistent else REFRESH_TOKEN_DAYS
    exp = _utcnow() + timedelta(days=days)
    jti = secrets.token_hex(16)
    payload = {"id": user_id, "type": "refresh", "jti": jti, "exp": exp, "iat": _utcnow()}
    token = jwt.encode(payload, _jwt_secret("REFRESH_SECRET", "dev-refresh-secret"), algorithm="HS256")
    return token, exp, jti


def _normalize_base(raw):
    val = (raw or "").strip().upper()
    return val if val in {"MANILA", "CEBU", "CDO"} else "UNKNOWN"


def _check_password(raw_password: str, stored_hash: str):
    if not raw_password or not stored_hash:
        return False
    try:
        return bcrypt.checkpw(raw_password.encode("utf-8"), stored_hash.encode("utf-8"))
    except Exception:
        return False


def _hash_value(raw_value: str):
    return bcrypt.hashpw(raw_value.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _get_bearer_token():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.lower().startswith("bearer "):
        return None
    return auth_header.split(" ", 1)[1].strip()


def _decode_access_token():
    token = _get_bearer_token()
    if not token:
        return None
    try:
        return jwt.decode(
            token,
            _jwt_secret("JWT_SECRET", "dev-jwt-secret"),
            algorithms=["HS256"],
        )
    except Exception:
        return None


def _serialize_user_doc(user_doc):
    def _convert(value):
        if isinstance(value, datetime):
            return value.isoformat()
        if isinstance(value, ObjectId):
            return str(value)
        if isinstance(value, dict):
            return {k: _convert(v) for k, v in value.items()}
        if isinstance(value, list):
            return [_convert(v) for v in value]
        return value

    clean = dict(user_doc or {})
    clean["_id"] = str(clean.get("_id"))
    clean.pop("password", None)
    clean.pop("pin", None)
    clean.pop("otp", None)
    clean.pop("loginOtp", None)
    clean.pop("pinOtp", None)
    return _convert(clean)


def _random_temp_password(length=8):
    alphabet = string.ascii_letters + string.digits
    return "".join(random.choice(alphabet) for _ in range(length))


def _random_otp():
    return f"{secrets.randbelow(1000000):06d}"


def _to_utc_datetime(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    return None


def _is_expired(value):
    dt = _to_utc_datetime(value)
    if not dt:
        return True
    return dt < _utcnow()


@user_bp.post("/login")
def login():
    try:
        db = get_db()
        payload = request.get_json(silent=True) or {}
        identifier = str(payload.get("identifier", "")).strip()
        password = str(payload.get("password", "")).strip()
        remember_me = bool(payload.get("rememberMe", False))
        trusted_device_token = str(
            payload.get("trustedDeviceToken")
            or request.headers.get("x-trusted-device-token")
            or ""
        )
        client = str(payload.get("client", "web")).strip().lower()
        platform = (
            "WEB" if client == "web" else "MOBILE" if client == "mobile" else "UNKNOWN"
        )
        base = _normalize_base(request.headers.get("x-base") or payload.get("base"))

        if not identifier or not password:
            return jsonify({"message": "Username/email and password required"}), 400
        if base == "UNKNOWN":
            return jsonify({"message": "Please select where you are logging in from"}), 400

        user = db.users.find_one({"$or": [{"username": identifier}, {"email": identifier}]})
        if not user:
            return jsonify({"message": "Account does not exist"}), 401

        if user.get("status") == "deactivated":
            return jsonify({"message": "Account deactivated. Contact support."}), 403

        if user.get("status") == "inactive":
            if user.get("invitationStatus") == "revoked":
                return jsonify({"message": "Invitation revoked. Contact your administrator."}), 403
            temp_exp = user.get("tempPasswordExpires")
            if _is_expired(temp_exp):
                db.users.update_one({"_id": user["_id"]}, {"$set": {"invitationStatus": "expired"}})
                return jsonify({"message": "Temporary password expired. Resend activation."}), 401
            if not _check_password(password, user.get("password", "")):
                return jsonify({"message": "Invalid temporary password"}), 401

            setup_token = jwt.encode(
                {"id": str(user["_id"]), "email": user.get("email"), "exp": _utcnow() + timedelta(hours=1)},
                _jwt_secret("JWT_SECRET", "dev-jwt-secret"),
                algorithm="HS256",
            )
            return jsonify({
                "message": "Temporary login successful. Proceed to security setup.",
                "requireSetup": True,
                "user": {"id": str(user["_id"]), "email": user.get("email"), "status": user.get("status"), "setupToken": setup_token},
            })

        if not _check_password(password, user.get("password", "")):
            return jsonify({"message": "Invalid username/email or password"}), 401

        trusted_devices = user.get("trustedDevices", []) if isinstance(user.get("trustedDevices"), list) else []
        valid_trusted = None
        if trusted_device_token:
            token_hash = _hash_trusted_token(trusted_device_token)
            now = _utcnow()
            for d in trusted_devices:
                exp_dt = _to_utc_datetime(d.get("expiresAt"))
                if (
                    d.get("tokenHash") == token_hash
                    and not d.get("revokedAt")
                    and exp_dt
                    and exp_dt > now
                ):
                    valid_trusted = d
                    break

        if valid_trusted:
            session_id = request.headers.get("x-session-id") or secrets.token_hex(16)
            db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"lastLogin": _utcnow(), "isOnline": True, "platform": platform.lower(), "lastSeenAt": _utcnow()}},
            )
            fresh_user = db.users.find_one({"_id": user["_id"]})
            access_token = _issue_access_token(fresh_user, session_id, platform, base)
            refresh_token, refresh_exp, jti = _issue_refresh_token(str(user["_id"]), remember_me)
            db.refresh_tokens.insert_one(
                {
                    "userId": str(user["_id"]),
                    "tokenHash": _hash_refresh_token(refresh_token),
                    "jti": jti,
                    "expiresAt": refresh_exp,
                    "revokedAt": None,
                    "isPersistent": remember_me,
                    "createdAt": _utcnow(),
                }
            )
            response = make_response(
                jsonify(
                    {
                        "message": "Login successful",
                        "token": access_token,
                        "sessionId": session_id,
                        "trustedDeviceAccepted": True,
                        "user": _serialize_user(fresh_user, base=base, session_id=session_id),
                    }
                )
            )
            max_age = int((REFRESH_TOKEN_DAYS_REMEMBER if remember_me else REFRESH_TOKEN_DAYS) * 86400)
            response.set_cookie("refreshToken", refresh_token, httponly=True, secure=False, samesite="Lax", max_age=max_age)
            return response

        otp = _random_otp()
        login_otp_token = secrets.token_hex(32)
        db.users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "loginOtp": _hash_value(otp),
                    "loginOtpExpires": _utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES),
                    "loginOtpToken": login_otp_token,
                    "loginOtpAttempts": 0,
                }
            },
        )
        try:
            send_login_otp_email(user.get("email"), otp)
            print(f"[LOGIN OTP SENT] email={user.get('email')}")
        except Exception as email_exc:
            print(f"[LOGIN OTP EMAIL FAILED] email={user.get('email')} error={email_exc}")
            return jsonify({"message": f"Failed to send OTP email: {str(email_exc)}"}), 500
        return jsonify(
            {
                "requireLoginOtp": True,
                "message": "Verification code sent to your email",
                "verification": {
                    "token": login_otp_token,
                    "email": user.get("email"),
                    "maskedEmail": _mask_email(user.get("email", "")),
                    "expiresInSeconds": OTP_EXPIRY_MINUTES * 60,
                },
                "loginContext": {"loginPlatform": platform, "rememberMe": remember_me, "base": base},
            }
        )
    except Exception as exc:
        return jsonify({"message": f"Login failed: {str(exc)}"}), 500


@user_bp.post("/login/verify-otp")
def verify_login_otp():
    try:
        db = get_db()
        payload = request.get_json(silent=True) or {}
        token = str(payload.get("token", "")).strip()
        otp = str(payload.get("otp", "")).strip()
        remember_me = bool(payload.get("rememberMe", False))
        trust_device = bool(payload.get("trustDevice", False))
        trusted_device_label = str(payload.get("trustedDeviceLabel", "web"))
        client = str(payload.get("client", "web")).strip().lower()
        platform = "WEB" if client == "web" else "MOBILE" if client == "mobile" else "UNKNOWN"
        base = _normalize_base(payload.get("base") or request.headers.get("x-base"))
        if not token or not otp:
            return jsonify({"message": "Token and OTP are required"}), 400
        user = db.users.find_one({"loginOtpToken": token})
        if not user or not user.get("loginOtp") or not user.get("loginOtpExpires"):
            return jsonify({"message": "Invalid or expired verification session"}), 401

        otp_expires = _to_utc_datetime(user.get("loginOtpExpires"))
        if not otp_expires or otp_expires < _utcnow():
            return jsonify({"message": "OTP expired. Request a new code."}), 401
        if not _check_password(otp, user.get("loginOtp", "")):
            db.users.update_one({"_id": user["_id"]}, {"$inc": {"loginOtpAttempts": 1}})
            return jsonify({"message": "Invalid OTP"}), 401

        session_id = request.headers.get("x-session-id") or secrets.token_hex(16)
        update_doc = {
            "$set": {
                "lastLogin": _utcnow(),
                "isOnline": True,
                "platform": platform.lower(),
                "lastSeenAt": _utcnow(),
                "loginOtp": None,
                "loginOtpExpires": None,
                "loginOtpToken": None,
                "loginOtpAttempts": 0,
            }
        }
        trusted_token = None
        if trust_device:
            trusted_token = secrets.token_hex(48)
            update_doc["$push"] = {
                "trustedDevices": {
                    "tokenHash": _hash_trusted_token(trusted_token),
                    "label": trusted_device_label,
                    "platform": platform.lower(),
                    "createdAt": _utcnow(),
                    "lastUsedAt": _utcnow(),
                    "expiresAt": _utcnow() + timedelta(days=TRUSTED_DEVICE_DAYS),
                    "revokedAt": None,
                }
            }
        db.users.update_one({"_id": user["_id"]}, update_doc)
        fresh_user = db.users.find_one({"_id": user["_id"]})
        access_token = _issue_access_token(fresh_user, session_id, platform, base)
        refresh_token, refresh_exp, jti = _issue_refresh_token(str(user["_id"]), remember_me)
        db.refresh_tokens.insert_one({"userId": str(user["_id"]), "tokenHash": _hash_refresh_token(refresh_token), "jti": jti, "expiresAt": refresh_exp, "revokedAt": None, "isPersistent": remember_me, "createdAt": _utcnow()})
        body = {
            "message": "Login successful",
            "token": access_token,
            "sessionId": session_id,
            "user": _serialize_user(fresh_user, base=base, session_id=session_id),
        }
        if trusted_token:
            body["trustedDeviceToken"] = trusted_token
        response = make_response(jsonify(body))
        max_age = int((REFRESH_TOKEN_DAYS_REMEMBER if remember_me else REFRESH_TOKEN_DAYS) * 86400)
        response.set_cookie("refreshToken", refresh_token, httponly=True, secure=False, samesite="Lax", max_age=max_age)
        return response
    except Exception as exc:
        return jsonify({"message": f"OTP verification failed: {str(exc)}"}), 500


@user_bp.post("/login/resend-otp")
def resend_login_otp():
    db = get_db()
    payload = request.get_json(silent=True) or {}
    token = str(payload.get("token", "")).strip()
    if not token:
        return jsonify({"message": "Token is required"}), 400
    user = db.users.find_one({"loginOtpToken": token})
    if not user:
        return jsonify({"message": "Invalid verification session"}), 404
    otp = _random_otp()
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"loginOtp": _hash_value(otp), "loginOtpExpires": _utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)}},
    )
    try:
        send_login_otp_email(user.get("email"), otp)
        print(f"[LOGIN OTP RESENT] email={user.get('email')}")
    except Exception as email_exc:
        print(f"[LOGIN OTP RESEND EMAIL FAILED] email={user.get('email')} error={email_exc}")
        return jsonify({"message": f"Failed to send OTP email: {str(email_exc)}"}), 500
    return jsonify({"message": "OTP resent"})


@user_bp.post("/refresh-token")
def refresh_token():
    db = get_db()
    raw = request.cookies.get("refreshToken")
    if not raw:
        return jsonify({"message": "Refresh token missing"}), 401

    try:
        decoded = jwt.decode(raw, _jwt_secret("REFRESH_SECRET", "dev-refresh-secret"), algorithms=["HS256"])
    except Exception:
        return jsonify({"message": "Invalid refresh token"}), 401

    token_hash = _hash_refresh_token(raw)
    stored = db.refresh_tokens.find_one({"tokenHash": token_hash, "revokedAt": None})
    if not stored:
        return jsonify({"message": "Refresh token revoked or unknown"}), 401
    if stored.get("expiresAt") and stored.get("expiresAt") < _utcnow():
        return jsonify({"message": "Refresh token expired"}), 401

    user_id = decoded.get("id")
    oid = _to_object_id(user_id)
    if not oid:
        return jsonify({"message": "Invalid token subject"}), 401
    user = db.users.find_one({"_id": oid})
    if not user:
        return jsonify({"message": "User not found"}), 404

    base = _normalize_base(request.headers.get("x-base"))
    platform = str(request.headers.get("x-platform", "WEB")).upper()
    session_id = request.headers.get("x-session-id") or secrets.token_hex(16)
    token = _issue_access_token(user, session_id, platform, base)
    return jsonify({"token": token})


@user_bp.post("/logout")
def logout():
    db = get_db()
    raw = request.cookies.get("refreshToken")
    if raw:
        db.refresh_tokens.update_one({"tokenHash": _hash_refresh_token(raw), "revokedAt": None}, {"$set": {"revokedAt": _utcnow(), "revokedReason": "logout"}})

    response = make_response(jsonify({"message": "Logged out"}))
    response.delete_cookie("refreshToken")
    return response


@user_bp.put("/session-preference")
def update_session_preference():
    payload = request.get_json(silent=True) or {}
    remember_me = bool(payload.get("rememberMe", False))
    revoke_persistent = bool(payload.get("revokePersistentTokens", False))

    if revoke_persistent:
        # Hook point for token cleanup once full session model is migrated.
        pass

    return jsonify({
        "message": "Session preference updated",
        "rememberMe": remember_me,
        "revokePersistentTokens": revoke_persistent,
    })


@user_bp.get("/username-exists")
def username_exists():
    db = get_db()
    username = str(request.args.get("username", "")).strip()
    if not username:
        return jsonify({"message": "Username is required"}), 400
    exists = db.users.find_one({"username": username}, {"_id": 1}) is not None
    return jsonify({"exists": exists})


@user_bp.get("/get-all-users")
def get_all_users():
    try:
        if not _decode_access_token():
            return jsonify({"message": "Unauthorized"}), 401
        db = get_db()
        users = list(db.users.find({}))
        return jsonify({"status": "Ok", "data": [_serialize_user_doc(u) for u in users]})
    except Exception as exc:
        return jsonify({
            "status": "Ok",
            "data": [],
            "message": f"Users fallback: {str(exc)}",
        })


@user_bp.get("/assignable-users")
def assignable_users():
    try:
        if not _decode_access_token():
            return jsonify({"message": "Unauthorized"}), 401
        db = get_db()
        users = list(
            db.users.find(
                {"status": "active", "jobTitle": {"$regex": "^mechanic$", "$options": "i"}},
                {
                    "firstName": 1,
                    "lastName": 1,
                    "jobTitle": 1,
                    "status": 1,
                    "image": 1,
                    "isOnline": 1,
                    "online": 1,
                    "platform": 1,
                },
            )
        )
        return jsonify({"status": "Ok", "data": [_serialize_user_doc(u) for u in users]})
    except Exception as exc:
        return jsonify({
            "status": "Ok",
            "data": [],
            "message": f"Assignable users fallback: {str(exc)}",
        })


@user_bp.put("/update-user-status/<id>")
def update_user_status(id):
    if not _decode_access_token():
        return jsonify({"message": "Unauthorized"}), 401
    db = get_db()
    oid = _to_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid user id"}), 400

    payload = request.get_json(silent=True) or {}
    status = str(payload.get("status", "")).strip().lower()
    if status not in {"active", "inactive", "deactivated"}:
        return jsonify({"message": "Invalid status"}), 400

    updated = db.users.find_one_and_update(
        {"_id": oid},
        {"$set": {"status": status}},
        return_document=ReturnDocument.AFTER,
    )
    if not updated:
        return jsonify({"message": "User not found"}), 404
    return jsonify(
        {
            "message": "User status updated successfully",
            "user": _serialize_user_doc(updated),
        }
    )


@user_bp.put("/update-user-profile/<id>")
def update_user_profile(id):
    if not _decode_access_token():
        return jsonify({"message": "Unauthorized"}), 401
    db = get_db()
    oid = _to_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid user id"}), 400

    payload = request.get_json(silent=True) or {}
    first_name = str(payload.get("firstName", "")).strip()
    last_name = str(payload.get("lastName", "")).strip()
    if not first_name or not last_name:
        return jsonify({"message": "First and Last name is required"}), 400

    updated = db.users.find_one_and_update(
        {"_id": oid},
        {"$set": {"firstName": first_name, "lastName": last_name}},
        return_document=ReturnDocument.AFTER,
    )
    if not updated:
        return jsonify({"message": "User not found"}), 404
    return jsonify({"message": "Name updated successfully", "user": _serialize_user_doc(updated)})


@user_bp.put("/change-password/<id>")
def change_password(id):
    if not _decode_access_token():
        return jsonify({"message": "Unauthorized"}), 401
    db = get_db()
    oid = _to_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid user id"}), 400

    payload = request.get_json(silent=True) or {}
    current_password = str(payload.get("currentPassword", "")).strip()
    new_password = str(payload.get("newPassword", "")).strip()
    if not current_password or not new_password:
        return jsonify({"message": "Both current and new passwords are required."}), 400

    user = db.users.find_one({"_id": oid})
    if not user:
        return jsonify({"message": "User not found."}), 404
    if not _check_password(current_password, user.get("password", "")):
        return jsonify({"message": "Current password is incorrect."}), 401
    if _check_password(new_password, user.get("password", "")):
        return jsonify({"message": "Cannot reuse the same password."}), 400

    db.users.update_one({"_id": oid}, {"$set": {"password": _hash_value(new_password)}})
    return jsonify({"message": "Password updated successfully."})


@user_bp.put("/update-pin/<id>")
def update_pin(id):
    if not _decode_access_token():
        return jsonify({"message": "Unauthorized"}), 401
    db = get_db()
    oid = _to_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid user id"}), 400

    payload = request.get_json(silent=True) or {}
    current_pin = str(payload.get("currentPin", "")).strip()
    new_pin = str(payload.get("newPin", "")).strip()
    if not current_pin or not new_pin:
        return jsonify({"message": "PIN is required"}), 400

    user = db.users.find_one({"_id": oid})
    if not user:
        return jsonify({"message": "User not found"}), 404
    if not user.get("pin"):
        return jsonify({"message": "User has no PIN set."}), 400
    if not _check_password(current_pin, user.get("pin", "")):
        return jsonify({"message": "Current PIN is incorrect."}), 401
    if _check_password(new_pin, user.get("pin", "")):
        return jsonify({"message": "Cannot reuse the same PIN."}), 400

    db.users.update_one({"_id": oid}, {"$set": {"pin": _hash_value(new_pin)}})
    return jsonify({"message": "PIN updated"})


@user_bp.post("/verify-pin/<id>")
def verify_pin(id):
    if not _decode_access_token():
        return jsonify({"message": "Unauthorized"}), 401
    db = get_db()
    oid = _to_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid user id"}), 400

    payload = request.get_json(silent=True) or {}
    pin = str(payload.get("pin", "")).strip()
    if not pin:
        return jsonify({"message": "PIN is required"}), 400

    user = db.users.find_one({"_id": oid})
    if not user:
        return jsonify({"message": "User not found"}), 404
    if not user.get("pin"):
        return jsonify({"message": "User has no PIN set."}), 400
    if not _check_password(pin, user.get("pin", "")):
        return jsonify({"message": "PIN is incorrect."}), 401
    return jsonify({"message": "PIN verified"})


@user_bp.post("/create")
def create_user():
    if not _decode_access_token():
        return jsonify({"message": "Unauthorized"}), 401
    db = get_db()

    data = request.form if request.form else (request.get_json(silent=True) or {})
    first_name = str(data.get("firstName", "")).strip()
    last_name = str(data.get("lastName", "")).strip()
    email = str(data.get("email", "")).strip()
    username = str(data.get("username", "")).strip()
    job_title = str(data.get("jobTitle", "")).strip()
    access = str(data.get("access", "")).strip() or "User"
    base = str(data.get("base", "")).strip().upper()
    license_no = str(data.get("licenseNo", "")).strip()
    image = ""

    if not all([first_name, last_name, email, username, job_title, base]):
        return jsonify({"message": "Missing required fields"}), 400
    if db.users.find_one({"$or": [{"email": email}, {"username": username}]}):
        return jsonify({"message": "User with same email or username already exists"}), 409

    temp_password = _random_temp_password(8)
    temp_exp = _utcnow() + timedelta(hours=1)

    doc = {
        "firstName": first_name,
        "lastName": last_name,
        "email": email,
        "username": username,
        "password": _hash_value(temp_password),
        "pin": "",
        "signature": "",
        "securitySetupCompleted": False,
        "status": "inactive",
        "jobTitle": job_title,
        "access": access,
        "base": base,
        "licenseNo": license_no or None,
        "image": image,
        "dateCreated": _utcnow(),
        "lastLogin": None,
        "isOnline": False,
        "platform": "unknown",
        "lastSeenAt": None,
        "invitationStatus": "pending",
        "invitationSentAt": _utcnow(),
        "invitationExpiresAt": temp_exp,
        "invitationClaimedAt": None,
        "tempPasswordExpires": temp_exp,
    }
    inserted = db.users.insert_one(doc)
    created = db.users.find_one({"_id": inserted.inserted_id})
    return jsonify(
        {
            "message": "User created successfully",
            "user": _serialize_user_doc(created),
            "data": _serialize_user_doc(created),
            "tempPassword": temp_password,
        }
    )


@user_bp.put("/update-user/<id>")
def update_user(id):
    if not _decode_access_token():
        return jsonify({"message": "Unauthorized"}), 401
    db = get_db()
    oid = _to_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid user id"}), 400

    data = request.form if request.form else (request.get_json(silent=True) or {})
    update_data = {}
    for key in ["firstName", "lastName", "email", "username", "jobTitle", "access", "base", "licenseNo"]:
        if key in data:
            val = data.get(key)
            update_data[key] = str(val).strip() if isinstance(val, str) else val

    updated = db.users.find_one_and_update(
        {"_id": oid},
        {"$set": update_data},
        return_document=ReturnDocument.AFTER,
    )
    if not updated:
        return jsonify({"message": "User not found"}), 404
    return jsonify(
        {"message": "User updated successfully", "user": _serialize_user_doc(updated), "data": _serialize_user_doc(updated)}
    )


@user_bp.put("/update-user-image/<id>")
def update_user_image(id):
    if not _decode_access_token():
        return jsonify({"message": "Unauthorized"}), 401
    db = get_db()
    oid = _to_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid user id"}), 400

    if "image" in request.files:
        upload = request.files["image"]
        filename = secure_filename(upload.filename or "")
        if not filename:
            return jsonify({"message": "Invalid image file"}), 400
        ext = Path(filename).suffix.lower()
        stored_name = f"profile-{id}-{secrets.token_hex(8)}{ext}"
        upload_dir = Path(__file__).resolve().parents[1] / "uploads" / "profiles"
        upload_dir.mkdir(parents=True, exist_ok=True)
        upload.save(upload_dir / stored_name)
        image = f"/uploads/profiles/{stored_name}"
    else:
        payload = request.get_json(silent=True) or {}
        image = str(payload.get("image", "")).strip()

    if not image:
        return jsonify({"message": "Image is required"}), 400

    updated = db.users.find_one_and_update(
        {"_id": oid},
        {"$set": {"image": image}},
        return_document=ReturnDocument.AFTER,
    )
    if not updated:
        return jsonify({"message": "User not found"}), 404
    return jsonify({"message": "Avatar updated", "user": _serialize_user_doc(updated)})


@user_bp.delete("/update-user-image/<id>")
def remove_user_image(id):
    if not _decode_access_token():
        return jsonify({"message": "Unauthorized"}), 401
    db = get_db()
    oid = _to_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid user id"}), 400
    updated = db.users.find_one_and_update(
        {"_id": oid},
        {"$set": {"image": ""}},
        return_document=ReturnDocument.AFTER,
    )
    if not updated:
        return jsonify({"message": "User not found"}), 404
    return jsonify({"message": "Avatar removed", "user": _serialize_user_doc(updated)})


@user_bp.post("/activate")
def activate_user():
    db = get_db()
    payload = request.get_json(silent=True) or {}
    token = str(payload.get("token", "")).strip()
    new_password = str(payload.get("newPassword", "")).strip()
    pin = str(payload.get("pin", "")).strip()
    if not token or not new_password or not pin:
        return jsonify({"message": "Token, new password, and PIN is required"}), 400
    try:
        decoded = jwt.decode(
            token, _jwt_secret("JWT_SECRET", "dev-jwt-secret"), algorithms=["HS256"]
        )
    except Exception:
        return jsonify({"message": "Setup token invalid or expired"}), 401

    oid = _to_object_id(decoded.get("id", ""))
    if not oid:
        return jsonify({"message": "User not found"}), 404
    user = db.users.find_one({"_id": oid})
    if not user:
        return jsonify({"message": "User not found"}), 404
    if user.get("status") == "active":
        return jsonify({"message": "Account already active"}), 400

    db.users.update_one(
        {"_id": oid},
        {
            "$set": {
                "password": _hash_value(new_password),
                "pin": _hash_value(pin),
                "status": "active",
                "securitySetupCompleted": True,
                "invitationStatus": "claimed",
                "invitationClaimedAt": _utcnow(),
            },
            "$unset": {"tempPasswordExpires": ""},
        },
    )
    return jsonify({"message": "Account activated successfully"})


@user_bp.post("/resend-activation")
def resend_activation():
    db = get_db()
    payload = request.get_json(silent=True) or {}
    email = str(payload.get("email", "")).strip()
    if not email:
        return jsonify({"message": "Email required"}), 400
    user = db.users.find_one({"email": email})
    if not user:
        return jsonify({"message": "User not found"}), 404
    if user.get("status") == "active":
        return jsonify({"message": "Account is already active"}), 400
    temp_password = _random_temp_password(8)
    temp_exp = _utcnow() + timedelta(hours=1)
    db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "password": _hash_value(temp_password),
                "invitationStatus": "pending",
                "invitationSentAt": _utcnow(),
                "invitationExpiresAt": temp_exp,
                "tempPasswordExpires": temp_exp,
            }
        },
    )
    return jsonify({"message": "Activation email resent", "tempPassword": temp_password})


@user_bp.post("/resend-activation/<id>")
def resend_activation_admin(id):
    if not _decode_access_token():
        return jsonify({"message": "Unauthorized"}), 401
    db = get_db()
    oid = _to_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid user id"}), 400
    user = db.users.find_one({"_id": oid})
    if not user:
        return jsonify({"message": "User not found"}), 404
    if user.get("status") == "active":
        return jsonify({"message": "Account is already active"}), 400
    temp_password = _random_temp_password(8)
    temp_exp = _utcnow() + timedelta(hours=1)
    db.users.update_one(
        {"_id": oid},
        {"$set": {"password": _hash_value(temp_password), "invitationStatus": "pending", "invitationSentAt": _utcnow(), "invitationExpiresAt": temp_exp, "tempPasswordExpires": temp_exp}},
    )
    return jsonify({"message": "Activation email resent", "tempPassword": temp_password})


@user_bp.put("/extend-invitation-expiry/<id>")
def extend_invitation_expiry(id):
    if not _decode_access_token():
        return jsonify({"message": "Unauthorized"}), 401
    db = get_db()
    oid = _to_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid user id"}), 400
    payload = request.get_json(silent=True) or {}
    hours = int(payload.get("hours") or 24)
    new_exp = _utcnow() + timedelta(hours=max(hours, 1))
    user = db.users.find_one_and_update(
        {"_id": oid},
        {"$set": {"invitationExpiresAt": new_exp, "tempPasswordExpires": new_exp, "invitationStatus": "pending"}},
        return_document=ReturnDocument.AFTER,
    )
    if not user:
        return jsonify({"message": "User not found"}), 404
    return jsonify({"message": "Invitation expiry extended", "invitationExpiresAt": user.get("invitationExpiresAt"), "invitationStatus": user.get("invitationStatus")})


@user_bp.put("/revoke-invitation/<id>")
def revoke_invitation(id):
    if not _decode_access_token():
        return jsonify({"message": "Unauthorized"}), 401
    db = get_db()
    oid = _to_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid user id"}), 400
    user = db.users.find_one_and_update(
        {"_id": oid},
        {"$set": {"invitationStatus": "revoked", "invitationExpiresAt": None}, "$unset": {"tempPasswordExpires": ""}},
        return_document=ReturnDocument.AFTER,
    )
    if not user:
        return jsonify({"message": "User not found"}), 404
    return jsonify({"message": "Invitation revoked"})


@user_bp.post("/request-password-reset")
def request_password_reset():
    db = get_db()
    payload = request.get_json(silent=True) or {}
    email = str(payload.get("email", "")).strip()
    if not email:
        return jsonify({"message": "Email is required"}), 400
    user = db.users.find_one({"email": email})
    if not user:
        return jsonify({"message": "User not found"}), 404
    token = secrets.token_hex(32)
    otp = _random_otp()
    exp = _utcnow() + timedelta(minutes=15)
    db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "resetPasswordToken": token,
                "resetPasswordExpires": exp,
                "otp": _hash_value(otp),
                "otpExpires": _utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES),
            }
        },
    )
    try:
        send_password_reset_otp_email(email, otp)
        print(f"[PASSWORD RESET OTP SENT] email={email}")
    except Exception as email_exc:
        print(f"[PASSWORD RESET OTP EMAIL FAILED] email={email} error={email_exc}")
        return jsonify({"message": f"Failed to send password reset email: {str(email_exc)}"}), 500
    return jsonify({"message": "Password reset email sent", "token": token})


@user_bp.post("/verify-otp")
def verify_reset_otp_disabled():
    db = get_db()
    payload = request.get_json(silent=True) or {}
    token = str(payload.get("token", "")).strip()
    otp = str(payload.get("otp", "")).strip()
    if not token or not otp:
        return jsonify({"message": "Token and OTP are required"}), 400
    user = db.users.find_one({"resetPasswordToken": token})
    if not user:
        return jsonify({"message": "Invalid or expired token"}), 400
    if not user.get("otp") or not user.get("otpExpires") or user.get("otpExpires") < _utcnow():
        return jsonify({"message": "OTP expired"}), 400
    if not _check_password(otp, user.get("otp", "")):
        return jsonify({"message": "Invalid OTP"}), 401
    return jsonify({"message": "OTP verified"})


@user_bp.post("/reset-password")
def reset_password():
    db = get_db()
    payload = request.get_json(silent=True) or {}
    token = str(payload.get("token", "")).strip()
    new_password = str(payload.get("newPassword", "")).strip()
    if not token or not new_password:
        return jsonify({"message": "Token and new password are required"}), 400
    user = db.users.find_one({"resetPasswordToken": token})
    if not user:
        return jsonify({"message": "Invalid or expired reset token"}), 400
    if not user.get("resetPasswordExpires") or user.get("resetPasswordExpires") < _utcnow():
        return jsonify({"message": "Reset token expired"}), 400
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password": _hash_value(new_password)}, "$unset": {"resetPasswordToken": "", "resetPasswordExpires": ""}},
    )
    return jsonify({"message": "Password reset successful"})


@user_bp.post("/request-pin-reset/<id>")
def request_pin_reset(id):
    db = get_db()
    oid = _to_object_id(id)
    if not oid:
        return jsonify({"message": "Invalid user id"}), 400
    user = db.users.find_one({"_id": oid})
    if not user:
        return jsonify({"message": "User not found"}), 404
    payload = request.get_json(silent=True) or {}
    current_password = str(payload.get("currentPassword", "")).strip()
    if not current_password:
        return jsonify({"message": "Current password is required"}), 400
    if not _check_password(current_password, user.get("password", "")):
        return jsonify({"message": "Current password is incorrect"}), 401
    token = secrets.token_hex(32)
    otp = _random_otp()
    exp = _utcnow() + timedelta(minutes=15)
    db.users.update_one(
        {"_id": oid},
        {"$set": {"resetPinToken": token, "resetPinExpires": exp, "pinOtp": _hash_value(otp), "pinOtpExpires": _utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)}},
    )
    print(f"[DEMO PIN RESET OTP] email={user.get('email')} otp={otp}")
    return jsonify({"message": "PIN reset requested", "token": token})


@user_bp.post("/verify-pin-otp")
def verify_pin_otp_disabled():
    db = get_db()
    payload = request.get_json(silent=True) or {}
    token = str(payload.get("token", "")).strip()
    otp = str(payload.get("otp", "")).strip()
    if not token or not otp:
        return jsonify({"message": "Token and OTP are required"}), 400
    user = db.users.find_one({"resetPinToken": token})
    if not user:
        return jsonify({"message": "Invalid or expired token"}), 400
    if not user.get("pinOtp") or not user.get("pinOtpExpires") or user.get("pinOtpExpires") < _utcnow():
        return jsonify({"message": "OTP expired"}), 400
    if not _check_password(otp, user.get("pinOtp", "")):
        return jsonify({"message": "Invalid OTP"}), 401
    return jsonify({"message": "OTP verified"})


@user_bp.post("/reset-pin")
def reset_pin():
    db = get_db()
    payload = request.get_json(silent=True) or {}
    token = str(payload.get("token", "")).strip()
    new_pin = str(payload.get("newPin", "")).strip()
    if not token or not new_pin:
        return jsonify({"message": "Token and new PIN are required"}), 400
    user = db.users.find_one({"resetPinToken": token})
    if not user:
        return jsonify({"message": "Invalid or expired PIN reset token"}), 400
    if not user.get("resetPinExpires") or user.get("resetPinExpires") < _utcnow():
        return jsonify({"message": "PIN reset token expired"}), 400
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"pin": _hash_value(new_pin)}, "$unset": {"resetPinToken": "", "resetPinExpires": ""}},
    )
    return jsonify({"message": "PIN reset successful"})
