from flask import request


def audit_mutating_request():
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        request.audit_payload = {"method": request.method, "path": request.path}
