export const normalizeRole = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const EXPORT_ACCESS = {
  reports: ["admin staff", "maintenance manager", "officer-in-charge"],
  activityLogs: ["admin staff"],
  flightLogs: [
    "admin staff",
    "maintenance manager",
    "officer-in-charge",
    "mechanic",
    "pilot",
  ],
  maintenanceLogs: [
    "admin staff",
    "maintenance manager",
    "officer-in-charge",
    "mechanic",
  ],
  preInspection: [
    "admin staff",
    "maintenance manager",
    "officer-in-charge",
    "mechanic",
    "pilot",
  ],
  postInspection: [
    "admin staff",
    "maintenance manager",
    "officer-in-charge",
    "mechanic",
    "pilot",
  ],
  partsLifespan: ["admin staff", "maintenance manager", "officer-in-charge"],
};

export const canExportModule = (role, moduleKey) => {
  if (!moduleKey) return false;
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "admin staff") return true;
  return (EXPORT_ACCESS[moduleKey] || []).includes(normalizedRole);
};

export default EXPORT_ACCESS;
