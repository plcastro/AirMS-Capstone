const permissions = {
  // ===== REPORTS AND ANALYTICS =====
  REPORTS_READ: "reports.read",
  REPORTS_EXPORT: "reports.export",

  // ===== MESSAGES =====
  MESSAGE_READ: "message.read",
  MESSAGE_SEND: "message.send",

  // ===== USER MANAGEMENT =====
  USERS_READ: "users.read",
  USERS_CREATE: "users.create",
  USERS_UPDATE: "users.update",
  USERS_DELETE: "users.delete",

  // ===== ACTIVITY LOGS =====
  ACTIVITYLOGS_READ: "activitylogs.read",

  // ===== FLIGHT LOGS =====
  FLIGHTLOG_READ: "flightlog.read",
  FLIGHTLOG_CREATE: "flightlog.create",
  FLIGHTLOG_UPDATE: "flightlog.update",
  FLIGHTLOG_DELETE: "flightlog.delete",

  // ===== MAINTENANCE LOGS =====
  MAINTENANCELOG_READ: "maintenancelog.read",
  MAINTENANCELOG_CREATE: "maintenancelog.create",
  MAINTENANCELOG_UPDATE: "maintenancelog.update",
  MAINTENANCELOG_DELETE: "maintenancelog.delete",

  // ===== PRE INSPECTION =====
  PREINSPECTION_READ: "preinspection.read",
  PREINSPECTION_CREATE: "preinspection.create",
  PREINSPECTION_UPDATE: "preinspection.update",

  // ===== POST INSPECTION =====
  POSTINSPECTION_READ: "postinspection.read",
  POSTINSPECTION_CREATE: "postinspection.create",
  POSTINSPECTION_UPDATE: "postinspection.update",

  // ===== TASKS =====
  TASKS_READ: "tasks.read",
  TASKS_CREATE: "tasks.create",
  TASKS_UPDATE: "tasks.update",
  TASKS_DELETE: "tasks.delete",

  // ===== MECHANICS =====
  MECHANICS_READ: "mechanics.read",
  MECHANICS_ASSIGN: "mechanics.assign",

  // ===== PARTS LIFESPAN MONITORING =====
  LIFESPANMONITORING_READ: "lifespanmonitoring.read",
  LIFESPANMONITORING_UPDATE: "lifespanmonitoring.update",
  LIFESPANMONITORING_EXPORT: "lifespanmonitoring.export",

  // ===== MAINTENANCE TRACKING =====
  MAINTENANCETRACKING_READ: "maintenancetracking.read",
  MAINTENANCETRACKING_CREATE: "maintenancetracking.create",
  MAINTENANCETRACKING_UPDATE: "maintenancetracking.update",

  // ===== MAINTENANCE PRIORITY SORTING =====
  MAINTENANCEPRIORITY_READ: "maintenancepriority.read",
  MAINTENANCEPRIORITY_UPDATE: "maintenancepriority.update",

  // ===== PARTS REQUISITION =====
  PARTSREQUISITION_READ: "partsrequisition.read",
  PARTSREQUISITION_CREATE: "partsrequisition.create",
  PARTSREQUISITION_UPDATE: "partsrequisition.update",
  PARTSREQUISITION_CANCEL: "partsrequisition.cancel",

  // ===== PROFILE =====
  PROFILE_READ: "profile.read",
  PROFILE_UPDATE: "profile.update",

  // ===== ADMIN =====
  ADMIN_PANEL: "admin.panel",
};

module.exports = permissions;
