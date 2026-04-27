const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const rbacMiddleware = require("../middleware/rbacMiddleware");

const {
  createAuditLogFromRequest,
  getAllUserLogs,
} = require("../controllers/logsController");

// Audit logs are admin-only
router.post(
  "/auditLog",
  verifyToken,
  rbacMiddleware.requireAdmin,
  rbacMiddleware.logAdminAction,
  createAuditLogFromRequest,
);
router.get(
  "/getAllUserLogs",
  verifyToken,
  rbacMiddleware.requireAdmin,
  rbacMiddleware.logAdminAction,
  getAllUserLogs,
);

module.exports = router;
