const permissions = {
  // TASKS
  TASKS_READ_ALL: "tasks.read.all",
  TASKS_READ_OWN: "tasks.read.own",
  TASKS_CREATE: "tasks.create",
  TASKS_UPDATE_ALL: "tasks.update.all",
  TASKS_UPDATE_OWN: "tasks.update.own",
  TASKS_DELETE: "tasks.delete",

  // USERS
  USERS_READ: "users.read",
  USERS_CREATE: "users.create",
  USERS_UPDATE: "users.update",
  USERS_DELETE: "users.delete",

  // MAINTENANCE
  MAINTENANCE_CREATE: "maintenance.create",
  MAINTENANCE_UPDATE: "maintenance.update",

  // FLIGHT LOGS
  FLIGHTLOG_READ: "flightlog.read",
  FLIGHTLOG_CREATE: "flightlog.create",

  // ADMIN
  ADMIN_PANEL: "admin.panel",

  // MESSAGE
  MESSAGE_SEND: "message.send",
  MESSAGE_READ: "message.read",
};

module.exports = permissions;
