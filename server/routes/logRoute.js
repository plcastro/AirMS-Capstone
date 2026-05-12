const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");

const permissions = require("../config/permissions");

const { requirePermission } = require("../middleware/permissions");

const {
  createAuditLogFromRequest,
  getAllUserLogs,
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

module.exports = router;
