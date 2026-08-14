const defineModulePermissions = (moduleKey, actions) => {
  const keyPrefix = moduleKey.replace(/-/g, "").toUpperCase();

  return actions.reduce((acc, action) => {
    const actionKey = action.replace(/\./g, "_").toUpperCase();
    acc[`${keyPrefix}_${actionKey}`] = `${moduleKey}.${action}`;
    return acc;
  }, {});
};

const MODULE_ACTIONS = {
  reports: ["read", "export"],
  message: ["read", "send"],
  users: ["read", "create", "update", "delete"],
  activitylogs: ["read"],
  flightlog: ["read", "create", "update", "delete"],
  maintenancelog: ["read", "create", "update", "delete"],
  preinspection: ["read", "create", "update"],
  postinspection: ["read", "create", "update"],
  tasks: [
    "read",
    "read.own",
    "read.all",
    "create",
    "update",
    "update.own",
    "update.all",
    "delete",
  ],
  mechanics: ["read", "assign"],
  lifespanmonitoring: ["read", "update", "export"],
  maintenancetracking: ["read", "create", "update"],
  maintenancepriority: ["read", "update"],
  partsrequisition: ["read", "create", "update", "cancel"],
  profile: ["read", "update"],
  superadmin: ["panel"],
};

const generatedPermissions = Object.entries(MODULE_ACTIONS).reduce(
  (acc, [moduleKey, actions]) => ({
    ...acc,
    ...defineModulePermissions(moduleKey, actions),
  }),
  {},
);

const permissions = {
  ...generatedPermissions,

  // Backward-compatible aliases for existing role config terms.
  WAREHOUSE_READ: generatedPermissions.PARTSREQUISITION_READ,
  WAREHOUSE_CREATE: generatedPermissions.PARTSREQUISITION_CREATE,
  WAREHOUSE_UPDATE: generatedPermissions.PARTSREQUISITION_UPDATE,
  WAREHOUSE_CANCEL: generatedPermissions.PARTSREQUISITION_CANCEL,
};

module.exports = permissions;
