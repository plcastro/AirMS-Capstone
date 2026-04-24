const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const rbacMiddleware = require("../middleware/rbacMiddleware");

const {
  getSecurityAlerts,
  getAlertStats,
  acknowledgeAlert,
  resolveAlert,
  getUnacknowledgedCount,
} = require("../controllers/adminSecurityAlertController");

// Get all security alerts
router.get(
  "/",
  verifyToken,
  rbacMiddleware.requireAdmin,
  rbacMiddleware.logAdminAction,
  getSecurityAlerts,
);

// Get alert statistics
router.get(
  "/stats",
  verifyToken,
  rbacMiddleware.requireAdmin,
  rbacMiddleware.logAdminAction,
  getAlertStats,
);

// Get unacknowledged critical alerts count
router.get(
  "/unacknowledged-count",
  verifyToken,
  rbacMiddleware.requireAdmin,
  getUnacknowledgedCount,
);

// Acknowledge an alert
router.put(
  "/:alertId/acknowledge",
  verifyToken,
  rbacMiddleware.requireAdmin,
  rbacMiddleware.logAdminAction,
  acknowledgeAlert,
);

// Resolve an alert
router.put(
  "/:alertId/resolve",
  verifyToken,
  rbacMiddleware.requireAdmin,
  rbacMiddleware.logAdminAction,
  resolveAlert,
);

module.exports = router;
