const rbacMiddleware = {
  requireAuth: (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    next();
  },

  // Access-level RBAC
  requireAdmin: (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    const access = req.user.access;

    if (!["Admin", "Superuser"].includes(access)) {
      return res.status(403).json({
        message: "Admin access required",
        currentAccess: access,
      });
    }

    next();
  },

  requireSuperuser: (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    if (req.user.access !== "Superuser") {
      return res.status(403).json({
        message: "Superuser access required",
        currentAccess: req.user.access,
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

  // Self or admin access
  requireSelfOrAdmin: (userIdParam = "id") => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          message: "Not authenticated",
        });
      }

      const targetUserId = req.params[userIdParam] || req.body[userId];

      const isSelf = String(req.user.id) === String(targetUserId);

      const isAdmin = ["Admin", "Superuser"].includes(req.user.access);

      if (!isSelf && !isAdmin) {
        return res.status(403).json({
          message: "Forbidden: You can only access your own account",
        });
      }

      next();
    };
  },

  // Optional admin activity logging
  logAdminAction: (req, res, next) => {
    if (req.user && ["Admin", "Superuser"].includes(req.user.access)) {
      req.adminAction = {
        performedBy: req.user.id,
        username: req.user.username,
        access: req.user.access,
        endpoint: req.originalUrl,
        method: req.method,
        timestamp: new Date(),
        ipAddress: req.ip || req.connection.remoteAddress,
      };
    }

    next();
  },
};

module.exports = rbacMiddleware;
