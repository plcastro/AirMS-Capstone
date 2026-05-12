const permissions = require("./permissions");

const jobTitles = {
  Mechanic: [
    permissions.TASKS_READ,
    permissions.TASKS_UPDATE,
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
    permissions.MESSAGE_READ,
    permissions.MESSAGE_SEND,
    permissions.WAREHOUSE_READ,
    permissions.WAREHOUSE_CREATE,
    permissions.WAREHOUSE_UPDATE,
    permissions.WAREHOUSE_CANCEL,
  ],
  "Maintenance Manager": [
    permissions.TASKS_READ,
    permissions.TASKS_CREATE,
    permissions.TASKS_UPDATE,
    permissions.MAINTENANCELOG_UPDATE,
    permissions.MESSAGE_READ,
    permissions.MESSAGE_SEND,
  ],

  Admin: [
    permissions.ADMIN_PANEL,
    permissions.USERS_CREATE,
    permissions.USERS_UPDATE,
    permissions.USERS_READ,
    permissions.TASKS_READ,
    permissions.TASKS_UPDATE,
    permissions.MESSAGE_READ,
    permissions.MESSAGE_SEND,
  ],
};

module.exports = jobTitles;
