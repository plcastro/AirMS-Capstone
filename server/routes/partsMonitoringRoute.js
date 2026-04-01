// routes/partsMonitoringRoutes.js
const express = require("express");
const router = express.Router();
const {
  getPartsLifespanMonitoring,
  getAllPartsLifespanMonitoring,
  savePartsLifespanMonitoring,
  deletePartsLifespanMonitoring,
  deleteAircraftData,
  getAircraftList,
} = require("../controllers/partsMonitoringController");

// Routes
router.get("/", getAllPartsLifespanMonitoring); // Get all records with pagination
router.get("/aircraft-list", getAircraftList); // Get all aircraft list
router.get("/:aircraft", getPartsLifespanMonitoring); // Get data for specific aircraft

router.post("/save", savePartsLifespanMonitoring); // Save or update data

router.delete("/:id", deletePartsLifespanMonitoring); // Delete by ID
router.delete("/aircraft/:aircraft", deleteAircraftData); // Delete all data for aircraft

module.exports = router;
