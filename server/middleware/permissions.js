const hasPermission = (req, permission) => {
  if (!req.permissions) return false;

  return (
    req.permissions.includes("*") ||
    req.permissions.includes(permission)
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