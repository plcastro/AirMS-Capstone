from flask import Blueprint, render_template

web_blueprint = Blueprint("web", __name__)

NAV = [
    ("View Users", "/web/dashboard/user-management/view-users"),
    ("Activity Logs", "/web/dashboard/user-management/activity-logs"),
    ("Flight Log", "/web/dashboard/flight-log"),
    ("Pre Inspection", "/web/dashboard/pre-inspection"),
    ("Post Inspection", "/web/dashboard/post-inspection"),
    ("Tasks", "/web/dashboard/tasks"),
    ("Mechanics", "/web/dashboard/mechanics"),
    ("Maintenance Log", "/web/dashboard/maintenance-log"),
    ("Parts Lifespan", "/web/dashboard/parts-lifespan-monitoring"),
    ("Maintenance Tracking", "/web/dashboard/maintenance-tracking"),
    ("Maintenance Priority", "/web/dashboard/maintenance-priority"),
    ("Maintenance Dashboard", "/web/dashboard/maintenance-dashboard"),
    ("Parts Requisition", "/web/dashboard/parts-requisition"),
    ("Messages", "/web/dashboard/messages"),
    ("Profile", "/web/dashboard/profile"),
]


def nav(active):
    return [{"label": label, "href": href, "active": href == active} for label, href in NAV]


def field(name, label, kind="text", options=None, required=False):
    return {"name": name, "label": label, "type": kind, "options": options or [], "required": required}


PAGES = {
    "view_users": {
        "title": "User Management",
        "subtitle": "Create users, update account details, and manage active/deactivated status.",
        "list": "/api/user/get-all-users",
        "create": "/api/user/create",
        "update": "/api/user/update-user/{id}",
        "status": "/api/user/update-user-status/{id}",
        "columns": ["username", "firstName", "lastName", "email", "jobTitle", "status"],
        "fields": [
            field("username", "Username", required=True),
            field("password", "Temporary Password", "password"),
            field("firstName", "First Name"),
            field("lastName", "Last Name"),
            field("email", "Email", "email"),
            field("jobTitle", "Role", "select", ["superadmin", "maintenance manager", "officer-in-charge", "mechanic", "pilot", "warehouse department"], True),
            field("status", "Status", "select", ["active", "inactive", "deactivated"]),
        ],
    },
    "activity_logs": {
        "title": "Activity Logs",
        "subtitle": "Audit trail of system actions and user activity.",
        "list": "/api/admin-activity",
        "readonly": True,
        "columns": ["createdAt", "username", "action", "method", "path", "module"],
    },
    "flight_log": {
        "title": "Flight Log",
        "subtitle": "Create, review, release, accept, and complete aircraft flight records.",
        "list": "/api/flightlogs",
        "create": "/api/flightlogs",
        "update": "/api/flightlogs/{id}",
        "columns": ["date", "rpc", "aircraft", "route", "pilot", "status"],
        "fields": [
            field("date", "Date", "date"),
            field("rpc", "RPC / Tail No.", required=True),
            field("aircraft", "Aircraft"),
            field("route", "Route"),
            field("pilot", "Pilot"),
            field("totalFlightTime", "Total Flight Time"),
            field("status", "Status", "select", ["draft", "released", "accepted", "completed"]),
        ],
        "actions": [
            {"label": "Release", "method": "PUT", "url": "/api/flightlogs/{id}/release"},
            {"label": "Accept", "method": "PUT", "url": "/api/flightlogs/{id}/accept"},
            {"label": "Complete", "method": "PUT", "url": "/api/flightlogs/{id}/complete"},
        ],
    },
    "pre_inspection": {
        "title": "Pre Inspection",
        "subtitle": "Record before-flight inspection checklists and sign-off results.",
        "list": "/api/pre-inspections/getAllPreInspection",
        "create": "/api/pre-inspections",
        "update": "/api/pre-inspections/{id}",
        "delete": "/api/pre-inspections/{id}",
        "columns": ["date", "aircraft", "rpc", "inspector", "status", "remarks"],
        "fields": [
            field("date", "Date", "date"),
            field("aircraft", "Aircraft"),
            field("rpc", "RPC / Tail No."),
            field("inspector", "Inspector"),
            field("status", "Status", "select", ["pending", "passed", "failed", "completed"]),
            field("remarks", "Remarks", "textarea"),
        ],
    },
    "post_inspection": {
        "title": "Post Inspection",
        "subtitle": "Record after-flight inspection findings, discrepancies, and corrective notes.",
        "list": "/api/post-inspections/getAllPostInspection",
        "create": "/api/post-inspections",
        "update": "/api/post-inspections/{id}",
        "delete": "/api/post-inspections/{id}",
        "columns": ["date", "aircraft", "rpc", "inspector", "status", "remarks"],
        "fields": [
            field("date", "Date", "date"),
            field("aircraft", "Aircraft"),
            field("rpc", "RPC / Tail No."),
            field("inspector", "Inspector"),
            field("status", "Status", "select", ["pending", "passed", "failed", "completed"]),
            field("remarks", "Remarks", "textarea"),
        ],
    },
    "tasks": {
        "title": "Task Assignment",
        "subtitle": "Assign inspection and maintenance work to mechanics and track progress.",
        "list": "/api/tasks/getAll",
        "create": "/api/tasks/create",
        "update": "/api/tasks/{id}",
        "delete": "/api/tasks/{id}",
        "columns": ["title", "task", "assignee", "aircraft", "priority", "status", "dueDate"],
        "fields": [
            field("title", "Title"),
            field("task", "Task Description", "textarea"),
            field("assignee", "Assignee"),
            field("aircraft", "Aircraft"),
            field("priority", "Priority", "select", ["low", "medium", "high", "critical"]),
            field("status", "Status", "select", ["pending", "in progress", "completed"]),
            field("dueDate", "Due Date", "date"),
        ],
    },
    "mechanics": {
        "title": "Mechanics",
        "subtitle": "Assignable maintenance users and their current task load.",
        "list": "/api/user/assignable-users",
        "readonly": True,
        "columns": ["username", "firstName", "lastName", "jobTitle", "status"],
    },
    "maintenance_log": {
        "title": "Maintenance Log",
        "subtitle": "Record maintenance activity, component work, and completion status.",
        "list": "/api/maintenance-logs/getAllMaintenanceLog",
        "create": "/api/maintenance-logs",
        "update": "/api/maintenance-logs/{id}",
        "delete": "/api/maintenance-logs/{id}",
        "columns": ["date", "aircraft", "component", "action", "mechanic", "status"],
        "fields": [
            field("date", "Date", "date"),
            field("aircraft", "Aircraft"),
            field("component", "Component"),
            field("action", "Action Taken", "textarea"),
            field("mechanic", "Mechanic"),
            field("status", "Status", "select", ["open", "in progress", "closed", "completed"]),
        ],
    },
    "parts_lifespan": {
        "title": "Parts Lifespan Monitoring",
        "subtitle": "Track aircraft components, remaining hours, and replacement priorities.",
        "list": "/api/parts-monitoring",
        "create": "/api/parts-monitoring/save",
        "delete": "/api/parts-monitoring/{id}",
        "columns": ["aircraft", "partName", "component", "serialNumber", "remainingHours", "priority"],
        "fields": [
            field("aircraft", "Aircraft", required=True),
            field("partName", "Part Name"),
            field("component", "Component"),
            field("serialNumber", "Serial Number"),
            field("remainingHours", "Remaining Hours", "number"),
            field("priority", "Priority", "select", ["low", "medium", "high", "critical"]),
        ],
    },
    "maintenance_tracking": {
        "title": "Maintenance Tracking",
        "subtitle": "View maintenance status by aircraft and remaining inspection hours.",
        "list": "/api/parts-monitoring/inspection-remaining-hours",
        "readonly": True,
        "columns": ["aircraft", "remainingHours", "inspectionName", "status"],
    },
    "maintenance_priority": {
        "title": "Maintenance Priority",
        "subtitle": "Prioritized components and aircraft needing attention.",
        "list": "/api/parts-monitoring/maintenance-priority",
        "readonly": True,
        "columns": ["aircraft", "partName", "component", "remainingHours", "priority"],
    },
    "parts_requisition": {
        "title": "Parts Requisition",
        "subtitle": "Create parts requests and update procurement or warehouse status.",
        "list": "/api/parts-requisition/get-all-requisition",
        "create": "/api/parts-requisition/create-requisition",
        "update": "/api/parts-requisition/update-requisition/{id}",
        "columns": ["requestNumber", "partName", "part", "quantity", "aircraft", "requestedBy", "status"],
        "fields": [
            field("requestNumber", "Request Number"),
            field("partName", "Part Name"),
            field("part", "Part / Description"),
            field("quantity", "Quantity", "number"),
            field("aircraft", "Aircraft"),
            field("requestedBy", "Requested By"),
            field("status", "Status", "select", ["pending", "approved", "released", "rejected"]),
        ],
    },
    "messages": {
        "title": "Messages",
        "subtitle": "Load conversations, open a thread, and send direct messages.",
        "messages": True,
    },
    "profile": {
        "title": "Profile",
        "subtitle": "View the active web session profile stored after login.",
        "profile": True,
    },
}


def render_dashboard(page_key, active_path):
    page = PAGES[page_key]
    template = "dashboard/messages.html" if page.get("messages") else "dashboard/profile.html" if page.get("profile") else "dashboard/crud_page.html"
    return render_template(
        template,
        title=page["title"],
        subtitle=page.get("subtitle", ""),
        nav_items=nav(active_path),
        page=page,
    )


@web_blueprint.get("/web/login")
def login():
    return render_template("auth/login.html", title="Login")


@web_blueprint.get("/web/forgot")
def forgot():
    return render_template("auth/forgot.html", title="Forgot Password")


@web_blueprint.get("/web/verification")
def verification():
    return render_template("auth/verification.html", title="Verification")


@web_blueprint.get("/web/reset-password")
def reset_password():
    return render_template("auth/reset_password.html", title="Reset Password")


@web_blueprint.get("/web/security-setup")
def security_setup():
    return render_template("auth/security_setup.html", title="Security Setup")


@web_blueprint.get("/web/dashboard/user-management/view-users")
def view_users():
    return render_dashboard("view_users", "/web/dashboard/user-management/view-users")


@web_blueprint.get("/web/dashboard/user-management/activity-logs")
def activity_logs():
    return render_dashboard("activity_logs", "/web/dashboard/user-management/activity-logs")


@web_blueprint.get("/web/dashboard/flight-log")
def flight_log():
    return render_dashboard("flight_log", "/web/dashboard/flight-log")


@web_blueprint.get("/web/dashboard/pre-inspection")
def pre_inspection():
    return render_dashboard("pre_inspection", "/web/dashboard/pre-inspection")


@web_blueprint.get("/web/dashboard/post-inspection")
def post_inspection():
    return render_dashboard("post_inspection", "/web/dashboard/post-inspection")


@web_blueprint.get("/web/dashboard/tasks")
def tasks():
    return render_dashboard("tasks", "/web/dashboard/tasks")


@web_blueprint.get("/web/dashboard/mechanics")
def mechanics():
    return render_dashboard("mechanics", "/web/dashboard/mechanics")


@web_blueprint.get("/web/dashboard/maintenance-log")
def maintenance_log():
    return render_dashboard("maintenance_log", "/web/dashboard/maintenance-log")


@web_blueprint.get("/web/dashboard/parts-lifespan-monitoring")
def parts_lifespan():
    return render_dashboard("parts_lifespan", "/web/dashboard/parts-lifespan-monitoring")


@web_blueprint.get("/web/dashboard/maintenance-tracking")
def maintenance_tracking():
    return render_dashboard("maintenance_tracking", "/web/dashboard/maintenance-tracking")


@web_blueprint.get("/web/dashboard/maintenance-priority")
def maintenance_priority():
    return render_dashboard("maintenance_priority", "/web/dashboard/maintenance-priority")


@web_blueprint.get("/web/dashboard/maintenance-dashboard")
def maintenance_dashboard():
    return render_dashboard("maintenance_dashboard", "/web/dashboard/maintenance-dashboard")


@web_blueprint.get("/web/dashboard/parts-requisition")
def parts_requisition():
    return render_dashboard("parts_requisition", "/web/dashboard/parts-requisition")


@web_blueprint.get("/web/dashboard/messages")
def messages():
    return render_dashboard("messages", "/web/dashboard/messages")


@web_blueprint.get("/web/dashboard/profile")
def profile():
    return render_dashboard("profile", "/web/dashboard/profile")


PAGES["maintenance_dashboard"] = {
    "title": "Maintenance Dashboard",
    "subtitle": "Live counts from tasks, flight logs, inspections, parts, and requisitions.",
    "dashboard": True,
    "readonly": True,
    "list": "/api/tasks/summary",
    "columns": ["metric", "value"],
}
