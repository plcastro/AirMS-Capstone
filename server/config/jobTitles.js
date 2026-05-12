const permissions = require("./permissions");

const jobTitles = {
  Mechanic: [
    permissions.USERS_READ,
    permissions.TASKS_READ_OWN,
    permissions.TASKS_UPDATE_OWN,
    permissions.MAINTENANCELOG_CREATE,
    permissions.MESSAGE_READ,
    permissions.MESSAGE_SEND,
  ],

  Pilot: [
    permissions.FLIGHTLOG_CREATE,
    permissions.FLIGHTLOG_READ,
    permissions.MESSAGE_READ,
    permissions.MESSAGE_SEND,
  ],

  "Warehouse Department": [
    permissions.MESSAGE_READ,
    permissions.MESSAGE_SEND,
    permissions.WAREHOUSE_READ,
    permissions.WAREHOUSE_CREATE,
    permissions.WAREHOUSE_UPDATE,
    permissions.WAREHOUSE_CANCEL,
  ],

  "Officer-In-Charge": [
    permissions.REPORTS_READ,
    permissions.REPORTS_EXPORT,

    permissions.WAREHOUSE_READ,
    permissions.WAREHOUSE_CREATE,
    permissions.WAREHOUSE_UPDATE,
    permissions.WAREHOUSE_CANCEL,

    permissions.MESSAGE_READ,
    permissions.MESSAGE_SEND,
  ],

  "Maintenance Manager": [
    permissions.TASKS_READ_ALL,
    permissions.TASKS_CREATE,
    permissions.TASKS_UPDATE_ALL,

    permissions.MAINTENANCELOG_UPDATE,

    permissions.MECHANICS_READ,
    permissions.MECHANICS_ASSIGN,

    permissions.MESSAGE_READ,
    permissions.MESSAGE_SEND,
  ],

  Admin: [
    permissions.ADMIN_PANEL,

    permissions.USERS_READ,
    permissions.USERS_CREATE,
    permissions.USERS_UPDATE,
    permissions.USERS_DELETE,

    permissions.TASKS_READ_ALL,
    permissions.TASKS_CREATE,
    permissions.TASKS_UPDATE_ALL,
    permissions.TASKS_DELETE,

    permissions.ACTIVITYLOGS_READ,

    permissions.MESSAGE_READ,
    permissions.MESSAGE_SEND,
  ],
};

module.exports = jobTitles;
