const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");

const permissions = require("../config/permissions");

const { requirePermission } = require("../middleware/permissions");

const {
  getAdminActivityLogs,
  getAdminActivitySummary,
  getAdminActivityDetails,
  exportAdminActivityLogs,
} = require("../controllers/adminActivityController");

/* =========================================
   ADMIN ACTIVITY LOGS
========================================= */

router.get(
  "/logs",
  verifyToken,
  requirePermission(permissions.ACTIVITYLOGS_READ),
  getAdminActivityLogs,
);

router.get(
  "/summary",
  verifyToken,
  requirePermission(permissions.ACTIVITYLOGS_READ),
  getAdminActivitySummary,
);

router.get(
  "/details/:activityId",
  verifyToken,
  requirePermission(permissions.ACTIVITYLOGS_READ),
  getAdminActivityDetails,
);

router.get(
  "/export",
  verifyToken,
  requirePermission(permissions.ACTIVITYLOGS_READ),
  exportAdminActivityLogs,
);

module.exports = router;
