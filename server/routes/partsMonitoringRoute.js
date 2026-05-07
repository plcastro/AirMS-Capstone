const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { touchSessionActivity } = require("../middleware/sessionActivity");
const { requireActionConfirmation } = require("../middleware/actionConfirmation");
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

router.get("/", getAllPartsMonitoring);
router.get("/aircraft-list", getAircraftList);
router.get("/maintenance-priority/rules", getMaintenancePriorityRules);
router.get("/maintenance-priority", getMaintenancePriority);
router.get("/inspection-remaining-hours", getInspectionRemainingHours);
router.get("/:aircraft", getPartsMonitoring);

router.post(
  "/save",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  savePartsMonitoring,
);
router.put(
  "/maintenance-priority/rules",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  saveMaintenancePriorityRules,
);

router.delete(
  "/:id",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  deletePartsMonitoring,
);
router.delete(
  "/aircraft/:aircraft",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  deleteAircraftData,
);

router.put(
  "/:aircraft/update-totals",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  updateAircraftTotals,
);

module.exports = router;
