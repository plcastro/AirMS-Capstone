const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { touchSessionActivity } = require("../middleware/sessionActivity");
const { requireActionConfirmation } = require("../middleware/actionConfirmation");
const {
  createMaintenanceLog,
  getAllMaintenanceLogs,
  getMaintenanceLogById,
  updateMaintenanceLog,
  deleteMaintenanceLog,
} = require("../controllers/maintenanceLogController");

// Get all maintenance logs
router.get("/getAllMaintenanceLog", getAllMaintenanceLogs);

// Get a single maintenance log
router.get("/getMaintenanceLogById/:id", getMaintenanceLogById);

router.post(
  "/createMaintenanceLog",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  createMaintenanceLog,
);

router.put(
  "/updateMaintenanceLogById/:id",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  updateMaintenanceLog,
);

router.delete(
  "/deleteMaintenanceLogById/:id",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  deleteMaintenanceLog,
);

module.exports = router;
