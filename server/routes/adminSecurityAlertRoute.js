const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");

const permissions = require("../config/permissions");

const { requirePermission } = require("../middleware/permissions");

const {
  getSecurityAlerts,
  getAlertStats,
  acknowledgeAlert,
  resolveAlert,
  getUnacknowledgedCount,
} = require("../controllers/adminSecurityAlertController");

/* =========================================
   SECURITY ALERTS
========================================= */

// Get all security alerts
router.get(
  "/",
  verifyToken,
  requirePermission(permissions.ADMINSTAFF_PANEL),
  getSecurityAlerts,
);

// Get alert statistics
router.get(
  "/stats",
  verifyToken,
  requirePermission(permissions.ADMINSTAFF_PANEL),
  getAlertStats,
);

// Get unacknowledged critical alerts count
router.get(
  "/unacknowledged-count",
  verifyToken,
  requirePermission(permissions.ADMINSTAFF_PANEL),
  getUnacknowledgedCount,
);

// Acknowledge an alert
router.put(
  "/:alertId/acknowledge",
  verifyToken,
  requirePermission(permissions.ADMINSTAFF_PANEL),
  acknowledgeAlert,
);

// Resolve an alert
router.put(
  "/:alertId/resolve",
  verifyToken,
  requirePermission(permissions.ADMINSTAFF_PANEL),
  resolveAlert,
);

module.exports = router;
