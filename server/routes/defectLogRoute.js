const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { touchSessionActivity } = require("../middleware/sessionActivity");
const { requireActionConfirmation } = require("../middleware/actionConfirmation");
const {
  createDefectLog,
  getAllDefectLogs,
  getDefectLogById,
  updateDefectLog,
  deleteDefectLog,
} = require("../controllers/defectLogController");

// Create a defect log
router.post(
  "/createDefect",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  createDefectLog,
);

// Get all defect logs
router.get("/getAllDefect", getAllDefectLogs);

// Get a single defect log
router.get("/getDefectById/:id", getDefectLogById);

// Update a defect log
router.put(
  "/updateDefectById/:id",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  updateDefectLog,
);

// Delete a defect log
router.delete(
  "/deleteDefectById/:id",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  deleteDefectLog,
);

module.exports = router;
