const express = require("express");
const router = express.Router();
const {
  createMaintenanceLog,
  getAllMaintenanceLogs,
  getMaintenanceLogById,
  updateMaintenanceLog,
  deleteMaintenanceLog,
} = require("../controllers/maintenanceLogController");

// Create a maintenance log
router.post("/createMaintenanceLog", createMaintenanceLog);

// Get all maintenance logs
router.get("/getAllMaintenanceLog", getAllMaintenanceLogs);

// Get a single maintenance log
router.get("/getMaintenanceLogById/:id", getMaintenanceLogById);

// Update a maintenance log
router.put("/updateMaintenanceLogById/:id", updateMaintenanceLog);

// Delete a maintenance log
router.delete("/deleteMaintenanceLogById/:id", deleteMaintenanceLog);

module.exports = router;
