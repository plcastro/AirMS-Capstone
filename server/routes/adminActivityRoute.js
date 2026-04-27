const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const rbacMiddleware = require("../middleware/rbacMiddleware");

const {
  getAdminActivityLogs,
  getAdminActivitySummary,
  getAdminActivityDetails,
  exportAdminActivityLogs,
} = require("../controllers/adminActivityController");

// All admin activity endpoints require admin access
router.get(
  "/logs",
  verifyToken,
  rbacMiddleware.requireAdmin,
  rbacMiddleware.logAdminAction,
  getAdminActivityLogs,
);

router.get(
  "/summary",
  verifyToken,
  rbacMiddleware.requireAdmin,
  rbacMiddleware.logAdminAction,
  getAdminActivitySummary,
);

router.get(
  "/details/:activityId",
  verifyToken,
  rbacMiddleware.requireAdmin,
  rbacMiddleware.logAdminAction,
  getAdminActivityDetails,
);

router.get(
  "/export",
  verifyToken,
  rbacMiddleware.requireAdmin,
  rbacMiddleware.logAdminAction,
  exportAdminActivityLogs,
);

module.exports = router;
