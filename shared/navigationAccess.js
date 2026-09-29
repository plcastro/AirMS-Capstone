const NAV_ACCESS = {
  reports: ["admin staff", "maintenance manager", "officer-in-charge"],
  messages: [
    "admin staff",
    "maintenance manager",
    "mechanic",
    "pilot",
    "officer-in-charge",
    "warehouse personnel",
  ],
  userManagement: ["admin staff"],
  activityLogs: ["admin staff"],
  flightLogs: [
    "admin staff",
    "pilot",
    "maintenance manager",
    "officer-in-charge",
    "mechanic",
  ],
  maintenanceLogs: [
    "admin staff",
    "maintenance manager",
    "officer-in-charge",
    "mechanic",
  ],
  preInspection: [
    "admin staff",
    "pilot",
    "maintenance manager",
    "officer-in-charge",
    "mechanic",
  ],
  postInspection: [
    "admin staff",
    "maintenance manager",
    "officer-in-charge",
    "mechanic",
  ],
  tasks: ["admin staff", "maintenance manager", "mechanic"],
  mechanics: ["admin staff", "maintenance manager", "mechanic"],
  partsLifespan: ["admin staff", "maintenance manager", "officer-in-charge"],
  maintenanceTracking: [
    "admin staff",
    "maintenance manager",
    "officer-in-charge",
  ],
  maintenancePriority: ["admin staff", "maintenance manager"],
  partsRequisition: [
    "admin staff",
    "warehouse personnel",
    "maintenance manager",
    "officer-in-charge",
    "mechanic",
  ],
  profile: [
    "admin staff",
    "maintenance manager",
    "mechanic",
    "pilot",
    "officer-in-charge",
    "warehouse personnel",
  ],
};

export const normalizeRole = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

export const resolveUserRole = (user, fallback = "") => {
  const jobTitle = normalizeRole(user?.jobTitle);
  if (jobTitle) return jobTitle;
  return normalizeRole(user?.access || fallback);
};

export const hasNavAccess = (role, accessKey) => {
  if (!accessKey) return true;
  const roles = NAV_ACCESS[accessKey] || [];
  return roles.includes(normalizeRole(role));
};

export default NAV_ACCESS;
