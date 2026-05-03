// routes/partsMonitoringRoutes.js
const express = require("express");
const router = express.Router();
const {
  getPartsMonitoring,
  getAllPartsMonitoring,
  getMaintenancePriority,
  getInspectionRemainingHours,
  getMaintenancePriorityRules,
  savePartsMonitoring,
  saveMaintenancePriorityRules,
  deletePartsMonitoring,
  deleteAircraftData,
  getAircraftList,
  updateAircraftTotals,
} = require("../controllers/partsMonitoringController");

// Routes
router.get("/", getAllPartsMonitoring); // Get all records with pagination
router.get("/aircraft-list", getAircraftList); // Get all aircraft list
router.get("/maintenance-priority/rules", getMaintenancePriorityRules);
router.get("/maintenance-priority", getMaintenancePriority); // Get ranked aircraft maintenance priority
router.get("/inspection-remaining-hours", getInspectionRemainingHours);
router.get("/:aircraft", getPartsMonitoring); // Get data for specific aircraft

router.post("/save", savePartsMonitoring); // Save or update data
router.put("/maintenance-priority/rules", saveMaintenancePriorityRules);

router.delete("/:id", deletePartsMonitoring); // Delete by ID
router.delete("/aircraft/:aircraft", deleteAircraftData); // Delete all data for aircraft

router.put("/:aircraft/update-totals", updateAircraftTotals);

module.exports = router;
