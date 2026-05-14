const hasPermission = (req, permission) => {
  if (!req.user?.jobTitle) return false;

  const jobTitles = require("../config/jobTitles");

  const role = req.user.jobTitle.toLowerCase();
  const permissions = jobTitles[role] || [];

  console.log("ROLE:", role);
  console.log("PERMISSIONS:", permissions);
  console.log("REQUIRED:", permission);
  return permissions.includes("*") || permissions.includes(permission);
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
