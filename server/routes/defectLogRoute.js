const express = require("express");
const router = express.Router();
const {
  createDefectLog,
  getAllDefectLogs,
  getDefectLogById,
  updateDefectLog,
  deleteDefectLog,
} = require("../controllers/defectLogController");

// Create a defect log
router.post("/createDefect", createDefectLog);

// Get all defect logs
router.get("/getAllDefect", getAllDefectLogs);

// Get a single defect log
router.get("/getDefectById/:id", getDefectLogById);

// Update a defect log
router.put("/updateDefectById/:id", updateDefectLog);

// Delete a defect log
router.delete("/deleteDefectById/:id", deleteDefectLog);

module.exports = router;
