export const normalizeRole = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const EXPORT_ACCESS = {
  reports: ["superadmin", "maintenance manager", "officer-in-charge"],
  activityLogs: ["superadmin"],
  flightLogs: ["superadmin", "maintenance manager", "officer-in-charge"],
  maintenanceLogs: ["superadmin", "maintenance manager", "officer-in-charge"],
  preInspection: ["superadmin", "maintenance manager", "officer-in-charge"],
  postInspection: ["superadmin", "maintenance manager", "officer-in-charge"],
  partsLifespan: ["superadmin", "maintenance manager", "officer-in-charge"],
};

export const canExportModule = (role, moduleKey) => {
  if (!moduleKey) return false;
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "superadmin") return true;
  return (EXPORT_ACCESS[moduleKey] || []).includes(normalizedRole);
};

export default EXPORT_ACCESS;
