NAV_ACCESS = {
    "reports": ["superadmin", "maintenance manager", "officer-in-charge"],
    "messages": ["superadmin", "maintenance manager", "mechanic", "pilot", "officer-in-charge", "warehouse department"],
    "userManagement": ["superadmin"],
    "activityLogs": ["superadmin"],
    "flightLogs": ["superadmin", "pilot", "maintenance manager", "officer-in-charge", "mechanic"],
    "maintenanceLogs": ["superadmin", "maintenance manager", "officer-in-charge", "mechanic"],
    "preInspection": ["superadmin", "pilot", "maintenance manager", "officer-in-charge", "mechanic"],
    "postInspection": ["superadmin", "maintenance manager", "officer-in-charge", "mechanic"],
    "tasks": ["superadmin", "maintenance manager", "mechanic"],
    "mechanics": ["superadmin", "maintenance manager"],
    "partsLifespan": ["superadmin", "maintenance manager", "officer-in-charge"],
    "maintenanceTracking": ["superadmin", "maintenance manager", "officer-in-charge"],
    "maintenancePriority": ["superadmin", "maintenance manager"],
    "partsRequisition": ["superadmin", "warehouse department", "maintenance manager", "officer-in-charge", "mechanic"],
    "profile": ["superadmin", "maintenance manager", "mechanic", "pilot", "officer-in-charge", "warehouse department"],
}


def normalize_role(value):
    return str(value or "").strip().lower()


def has_nav_access(role, access_key):
    if not access_key:
        return True
    return normalize_role(role) in NAV_ACCESS.get(access_key, [])
