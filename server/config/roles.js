const permissions = require("./permissions");

const roles = {
  Mechanic: [
    permissions.TASKS_READ_OWN,
    permissions.TASKS_UPDATE_OWN,
    permissions.MAINTENANCE_CREATE,
    permissions.MESSAGE_READ,
    permissions.MESSAGE_SEND,
  ],

  Pilot: [
    permissions.FLIGHTLOG_CREATE,
    permissions.FLIGHTLOG_READ,
    permissions.MESSAGE_READ,
  ],

  "Maintenance Manager": [
    permissions.TASKS_READ_ALL,
    permissions.TASKS_CREATE,
    permissions.TASKS_UPDATE_ALL,
    permissions.MAINTENANCE_UPDATE,
    permissions.MESSAGE_READ,
    permissions.MESSAGE_SEND,
  ],

  Admin: [
    permissions.ADMIN_PANEL,
    permissions.USERS_CREATE,
    permissions.USERS_UPDATE,
    permissions.USERS_READ,
    permissions.TASKS_READ_ALL,
    permissions.TASKS_UPDATE_ALL,
  ],

  Superuser: ["*"],
};

module.exports = roles;
