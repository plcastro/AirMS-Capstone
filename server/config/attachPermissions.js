const jobTitles = require("./jobTitles");

const attachPermissions = (req, res, next) => {
  if (!req.user) return next();

  const jobTitlePermissions = jobTitles[req.user.jobTitle] || [];

  req.permissions = jobTitlePermissions;

  next();
};

module.exports = attachPermissions;
