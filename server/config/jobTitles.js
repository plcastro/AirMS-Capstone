const permissions = require("./permissions");
const ALL_PERMISSIONS = Object.values(permissions);

const byModule = {
  users: {
    read: permissions.USERS_READ,
    create: permissions.USERS_CREATE,
    update: permissions.USERS_UPDATE,
    delete: permissions.USERS_DELETE,
  },
  tasks: {
    readOwn: permissions.TASKS_READ_OWN,
    readAll: permissions.TASKS_READ_ALL,
    create: permissions.TASKS_CREATE,
    updateOwn: permissions.TASKS_UPDATE_OWN,
    updateAll: permissions.TASKS_UPDATE_ALL,
    delete: permissions.TASKS_DELETE,
  },
  maintenanceLog: {
    create: permissions.MAINTENANCELOG_CREATE,
    update: permissions.MAINTENANCELOG_UPDATE,
  },
  message: {
    read: permissions.MESSAGE_READ,
    send: permissions.MESSAGE_SEND,
  },
  flightLog: {
    read: permissions.FLIGHTLOG_READ,
    create: permissions.FLIGHTLOG_CREATE,
  },
  reports: {
    read: permissions.REPORTS_READ,
    export: permissions.REPORTS_EXPORT,
  },
  warehouse: {
    read: permissions.PARTSREQUISITION_READ,
    create: permissions.PARTSREQUISITION_CREATE,
    update: permissions.PARTSREQUISITION_UPDATE,
    cancel: permissions.PARTSREQUISITION_CANCEL,
  },
  mechanics: {
    read: permissions.MECHANICS_READ,
    assign: permissions.MECHANICS_ASSIGN,
  },
  profile: {
    read: permissions.PROFILE_READ,
    update: permissions.PROFILE_UPDATE,
  },
  activityLogs: {
    read: permissions.ACTIVITYLOGS_READ,
  },
  admin: {
    panel: permissions.ADMIN_PANEL,
  },
};

const pick = (...permissionValues) =>
  permissionValues.filter((permission) => Boolean(permission));

const rolePermissions = {
  mechanic: pick(
    byModule.users.read,
    byModule.tasks.readOwn,
    byModule.tasks.updateOwn,
    byModule.maintenanceLog.create,
    byModule.message.read,
    byModule.message.send,
    byModule.profile.read,
    byModule.profile.update,
  ),
  pilot: pick(
    byModule.flightLog.create,
    byModule.flightLog.read,
    byModule.message.read,
    byModule.message.send,
    byModule.profile.read,
    byModule.profile.update,
  ),
  "warehouse department": pick(
    byModule.message.read,
    byModule.message.send,
    byModule.warehouse.read,
    byModule.warehouse.create,
    byModule.warehouse.update,
    byModule.warehouse.cancel,
    byModule.profile.read,
    byModule.profile.update,
  ),
  "officer-in-charge": pick(
    byModule.reports.read,
    byModule.reports.export,
    byModule.warehouse.read,
    byModule.warehouse.create,
    byModule.warehouse.update,
    byModule.warehouse.cancel,
    byModule.message.read,
    byModule.message.send,
    byModule.profile.read,
    byModule.profile.update,
  ),
  "maintenance manager": pick(
    byModule.tasks.readAll,
    byModule.tasks.create,
    byModule.tasks.updateAll,
    byModule.users.read,
    byModule.maintenanceLog.update,
    byModule.mechanics.read,
    byModule.mechanics.assign,
    byModule.message.read,
    byModule.message.send,
    byModule.profile.read,
    byModule.profile.update,
  ),
  admin: pick(
    ...ALL_PERMISSIONS,
  ),
};

module.exports = rolePermissions;
