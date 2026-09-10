const permissions = require("./permissions");

const jobTitles = {
  mechanic: [
    permissions.USERS_READ,
    permissions.TASKS_READ_OWN,
    permissions.TASKS_UPDATE_OWN,
    permissions.MAINTENANCELOG_CREATE,
    permissions.PROFILE_READ,
    permissions.PROFILE_UPDATE,
    permissions.MESSAGE_READ,
    permissions.MESSAGE_SEND,
  ],

  pilot: [
    permissions.FLIGHTLOG_CREATE,
    permissions.FLIGHTLOG_READ,
    permissions.PROFILE_READ,
    permissions.PROFILE_UPDATE,
    permissions.MESSAGE_READ,
    permissions.MESSAGE_SEND,
  ],

  "warehouse staff": [
    permissions.MESSAGE_READ,
    permissions.MESSAGE_SEND,
    permissions.WAREHOUSE_READ,
    permissions.WAREHOUSE_CREATE,
    permissions.WAREHOUSE_UPDATE,
    permissions.WAREHOUSE_CANCEL,
    permissions.PROFILE_READ,
    permissions.PROFILE_UPDATE,
  ],

  "officer-in-charge": [
    permissions.REPORTS_READ,
    permissions.REPORTS_EXPORT,

    permissions.WAREHOUSE_READ,
    permissions.WAREHOUSE_CREATE,
    permissions.WAREHOUSE_UPDATE,
    permissions.WAREHOUSE_CANCEL,

    permissions.PROFILE_READ,
    permissions.PROFILE_UPDATE,

    permissions.MESSAGE_READ,
    permissions.MESSAGE_SEND,
  ],

  "maintenance manager": [
    permissions.REPORTS_READ,
    permissions.REPORTS_EXPORT,

    permissions.TASKS_READ_ALL,
    permissions.TASKS_CREATE,
    permissions.TASKS_UPDATE_ALL,

    permissions.MAINTENANCELOG_UPDATE,

    permissions.MECHANICS_READ,
    permissions.MECHANICS_ASSIGN,
    permissions.PROFILE_READ,
    permissions.PROFILE_UPDATE,

    permissions.MESSAGE_READ,
    permissions.MESSAGE_SEND,
  ],

  superadmin: [
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

    permissions.PROFILE_READ,
    permissions.PROFILE_UPDATE,

    permissions.MESSAGE_READ,
    permissions.MESSAGE_SEND,
  ],
};

module.exports = jobTitles;
