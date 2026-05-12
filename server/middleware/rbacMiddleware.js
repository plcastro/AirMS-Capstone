const rbacMiddleware = {
  // Authentication check
  requireAuth: (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    next();
  },

  // Job-title RBAC
  requireJobTitle: (allowedJobTitles = []) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          message: "Not authenticated",
        });
      }

      const userJobTitle = req.user.jobTitle;

      const allowed = Array.isArray(allowedJobTitles)
        ? allowedJobTitles
        : [allowedJobTitles];

      if (!allowed.includes(userJobTitle)) {
        return res.status(403).json({
          message: "Insufficient job title permissions",
          allowedJobTitles: allowed,
          currentJobTitle: userJobTitle,
        });
      }

      next();
    };
  },
};

module.exports = rbacMiddleware;
