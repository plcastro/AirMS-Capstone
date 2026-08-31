const express = require("express");
const { exportReportExcel } = require("../controllers/reportExportController");
const { verifyToken } = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/permissions");
const permissions = require("../config/permissions");

const router = express.Router();
router.post("/export-excel", verifyToken, requirePermission(permissions.REPORTS_EXPORT), exportReportExcel);
module.exports = router;
