NAV_ACCESS = {
    "reports": ["admin", "maintenance manager", "officer-in-charge"],
    "messages": ["admin", "maintenance manager", "mechanic", "pilot", "officer-in-charge", "warehouse department"],
    "userManagement": ["admin"],
    "activityLogs": ["admin"],
    "flightLogs": ["admin", "pilot", "maintenance manager", "officer-in-charge", "mechanic"],
    "maintenanceLogs": ["admin", "maintenance manager", "officer-in-charge", "mechanic"],
    "preInspection": ["admin", "pilot", "maintenance manager", "officer-in-charge", "mechanic"],
    "postInspection": ["admin", "maintenance manager", "officer-in-charge", "mechanic"],
    "tasks": ["admin", "maintenance manager", "mechanic"],
    "mechanics": ["admin", "maintenance manager"],
    "partsLifespan": ["admin", "maintenance manager", "officer-in-charge"],
    "maintenanceTracking": ["admin", "maintenance manager", "officer-in-charge"],
    "maintenancePriority": ["admin", "maintenance manager"],
    "partsRequisition": ["admin", "warehouse department", "maintenance manager", "officer-in-charge", "mechanic"],
    "profile": ["admin", "maintenance manager", "mechanic", "pilot", "officer-in-charge", "warehouse department"],
}


def normalize_role(value):
    return str(value or "").strip().lower()


def has_nav_access(role, access_key):
    if not access_key:
        return True
    return normalize_role(role) in NAV_ACCESS.get(access_key, [])
