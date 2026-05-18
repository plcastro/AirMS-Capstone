const jobTitles = require("../config/jobTitles");

const normalizeRole = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase();

const hasPermission = (req, permission) => {
  if (!req.user) return false;

  const jobTitleRole = normalizeRole(req.user.jobTitle);
  const accessRole = normalizeRole(req.user.access);
  const resolvedRole = jobTitles[jobTitleRole]
    ? jobTitleRole
    : jobTitles[accessRole]
      ? accessRole
      : "";

  const rolePermissions = resolvedRole ? jobTitles[resolvedRole] || [] : [];

  // Hard guarantee: Admin access can open all modules even if role mapping drifts.
  if (accessRole === "admin" || jobTitleRole === "admin") return true;

  return (
    rolePermissions.includes("*") || rolePermissions.includes(permission)
  );
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!hasPermission(req, permission)) {
      return res.status(403).json({
        message: "Forbidden",
        requiredPermission: permission,
      });
    }

    next();
  };
};

module.exports = {
  hasPermission,
  requirePermission,
};
