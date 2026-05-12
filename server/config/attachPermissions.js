const roles = require("../config/roles");

const attachPermissions = (req, res, next) => {
  if (!req.user) return next();

  const rolePermissions = roles[req.user.jobTitle] || [];

  req.permissions = rolePermissions;

  next();
};

module.exports = attachPermissions;
