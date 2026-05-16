const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");

const permissions = require("../config/permissions");

const { requirePermission } = require("../middleware/permissions");

const {
  createAuditLogFromRequest,
  getAllUserLogs,
  getLatestLog,
} = require("../controllers/logsController");

router.post(
  "/auditLog",
  verifyToken,
  requirePermission(permissions.ACTIVITYLOGS_READ),
  createAuditLogFromRequest,
);

router.get(
  "/getAllUserLogs",
  verifyToken,
  requirePermission(permissions.ACTIVITYLOGS_READ),
  getAllUserLogs,
);

router.get(
  "/latest",
  verifyToken,
  requirePermission(permissions.ACTIVITYLOGS_READ),
  getLatestLog,
);

module.exports = router;
