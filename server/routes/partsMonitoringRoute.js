// routes/partsMonitoringRoutes.js
const express = require("express");
const router = express.Router();
const {
  savePartsMonitoring,
  deleteAircraftData,
  deletePartsMonitoring,
  getAircraftList,
  getAllPartsMonitoring,
  getPartsMonitoring,
} = require("../controllers/partsMonitoringController");

// Routes
router.get("/", getAllPartsMonitoring); // Get all records with pagination
router.get("/aircraft-list", getAircraftList); // Get all aircraft list
router.get("/:aircraft", getPartsMonitoring); // Get data for specific aircraft

router.post("/save", savePartsMonitoring); // Save or update data

router.delete("/:id", deletePartsMonitoring); // Delete by ID
router.delete("/aircraft/:aircraft", deleteAircraftData); // Delete all data for aircraft

module.exports = router;
