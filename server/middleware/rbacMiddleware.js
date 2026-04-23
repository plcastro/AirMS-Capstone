/**
 * RBAC (Role-Based Access Control) Middleware
 * Provides granular permission checks for admin operations
 */

const rbacMiddleware = {
  /**
   * Verify user has admin or superuser access
   */
  requireAdmin: (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!["Admin", "Superuser"].includes(req.user.access)) {
      return res.status(403).json({
        message: "Forbidden: Admin access required",
        requiredAccess: "Admin or Superuser",
      });
    }

    next();
  },

  /**
   * Verify user has superuser access (higher privilege than admin)
   */
  requireSuperuser: (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (req.user.access !== "Superuser") {
      return res.status(403).json({
        message: "Forbidden: Superuser access required",
        requiredAccess: "Superuser",
      });
    }

    next();
  },

  /**
   * Verify user has specific access levels
   * @param {string|string[]} allowedAccess - Single or array of allowed access levels
   */
  requireAccess: (allowedAccess) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const allowed = Array.isArray(allowedAccess)
        ? allowedAccess
        : [allowedAccess];

      if (!allowed.includes(req.user.access)) {
        return res.status(403).json({
          message: "Forbidden: Insufficient access level",
          requiredAccess: allowed,
          currentAccess: req.user.access,
        });
      }

      next();
    };
  },

  /**
   * Allow self or admin access
   * Used for user profile/preference updates
   */
  requireSelfOrAdmin: (userIdParam = "userId") => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const targetUserId = req.params[userIdParam] || req.body.userId;
      const isAdmin = ["Admin", "Superuser"].includes(req.user.access);
      const isSelf = req.user.id === targetUserId;

      if (!isAdmin && !isSelf) {
        return res.status(403).json({
          message: "Forbidden: Can only access own data or admin required",
          attemptedAccess: targetUserId,
          currentUser: req.user.id,
        });
      }

      next();
    };
  },

  /**
   * Log admin actions for audit trail
   */
  logAdminAction: async (req, res, next) => {
    if (!req.user) {
      return next();
    }

    // Only log for admin/superuser actions
    if (["Admin", "Superuser"].includes(req.user.access)) {
      req.adminAction = {
        performedBy: req.user.id,
        username: req.user.username,
        email: req.user.email,
        access: req.user.access,
        timestamp: new Date(),
        method: req.method,
        endpoint: req.originalUrl,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get("user-agent"),
      };
    }

    next();
  },

  /**
   * Verify admin can only manage users with lower or equal privilege levels
   * Prevents admins from modifying other admins/superusers without superuser role
   */
  verifyPrivilegeLevelChange: async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const targetAccessLevel = req.body.access;

    if (!targetAccessLevel) {
      return next(); // No access change attempted
    }

    const accessHierarchy = { User: 0, Admin: 1, Superuser: 2 };
    const userLevel = accessHierarchy[req.user.access];
    const targetLevel = accessHierarchy[targetAccessLevel];

    // Only superuser can create/modify admins and superusers
    if (targetLevel >= 1 && req.user.access !== "Superuser") {
      return res.status(403).json({
        message:
          "Forbidden: Only superuser can assign Admin or Superuser roles",
        attemptedRole: targetAccessLevel,
      });
    }

    next();
  },
};

module.exports = rbacMiddleware;
