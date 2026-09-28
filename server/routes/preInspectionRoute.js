const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { touchSessionActivity } = require("../middleware/sessionActivity");
const { requireActionConfirmation } = require("../middleware/actionConfirmation");
const workflow = require('../controllers/flightInspectionWorkflowController');
const {
  createPreInspection,
  getAllPreInspections,
  getPreInspectionById,
  updatePreInspection,
  deletePreInspection,
} = require("../controllers/preInspectionController");

router.use(verifyToken);

router.post(
  "/createPreInspection",
  touchSessionActivity,
  requireActionConfirmation,
  workflow.createLegacy,
);
router.get("/getAllPreInspection", getAllPreInspections);
router.get("/getPreInspectionById/:id", getPreInspectionById);
router.put(
  "/updatePreInspectionById/:id",
  touchSessionActivity,
  requireActionConfirmation,
  workflow.edit('pre'),
);
router.delete(
  "/deletePreInspectionById/:id",
  touchSessionActivity,
  requireActionConfirmation,
  workflow.remove,
);

module.exports = router;
