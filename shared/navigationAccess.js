const NAV_ACCESS = {
  reports: ["superadmin", "maintenance manager", "officer-in-charge"],
  messages: [
    "superadmin",
    "maintenance manager",
    "mechanic",
    "pilot",
    "officer-in-charge",
    "warehouse department",
  ],
  userManagement: ["superadmin"],
  activityLogs: ["superadmin"],
  flightLogs: [
    "superadmin",
    "pilot",
    "maintenance manager",
    "officer-in-charge",
    "mechanic",
  ],
  maintenanceLogs: [
    "superadmin",
    "maintenance manager",
    "officer-in-charge",
    "mechanic",
  ],
  preInspection: [
    "superadmin",
    "pilot",
    "maintenance manager",
    "officer-in-charge",
    "mechanic",
  ],
  postInspection: [
    "superadmin",
    "maintenance manager",
    "officer-in-charge",
    "mechanic",
  ],
  tasks: ["superadmin", "maintenance manager", "mechanic"],
  mechanics: ["superadmin", "maintenance manager"],
  partsLifespan: ["superadmin", "maintenance manager", "officer-in-charge"],
  maintenanceTracking: ["superadmin", "maintenance manager", "officer-in-charge"],
  maintenancePriority: ["superadmin", "maintenance manager"],
  partsRequisition: [
    "superadmin",
    "warehouse department",
    "maintenance manager",
    "officer-in-charge",
    "mechanic",
  ],
  profile: [
    "superadmin",
    "maintenance manager",
    "mechanic",
    "pilot",
    "officer-in-charge",
    "warehouse department",
  ],
};

export const normalizeRole = (value) => String(value || "").trim().toLowerCase();

export const hasNavAccess = (role, accessKey) => {
  if (!accessKey) return true;
  const roles = NAV_ACCESS[accessKey] || [];
  return roles.includes(normalizeRole(role));
};

export default NAV_ACCESS;
