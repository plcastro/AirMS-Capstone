from flask import request


def attach_request_context():
    request.request_context = {
        "path": request.path,
        "method": request.method,
        "platform": request.headers.get("x-platform"),
        "base": request.headers.get("x-base"),
        "session_id": request.headers.get("x-session-id"),
    }
