export const normalizeRole = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const EXPORT_ACCESS = {
  reports: ["superadmin", "maintenance manager", "officer-in-charge"],
  activityLogs: ["superadmin"],
  flightLogs: [
    "superadmin",
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
  partsLifespan: ["superadmin", "maintenance manager", "officer-in-charge"],
};

export const canExportModule = (role, moduleKey) => {
  if (!moduleKey) return false;
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "superadmin") return true;
  return (EXPORT_ACCESS[moduleKey] || []).includes(normalizedRole);
};

export default EXPORT_ACCESS;
