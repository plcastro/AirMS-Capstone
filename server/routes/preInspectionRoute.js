const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { touchSessionActivity } = require("../middleware/sessionActivity");
const { requireActionConfirmation } = require("../middleware/actionConfirmation");
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
  createPreInspection,
);
router.get("/getAllPreInspection", getAllPreInspections);
router.get("/getPreInspectionById/:id", getPreInspectionById);
router.put(
  "/updatePreInspectionById/:id",
  touchSessionActivity,
  requireActionConfirmation,
  updatePreInspection,
);
router.delete(
  "/deletePreInspectionById/:id",
  touchSessionActivity,
  requireActionConfirmation,
  deletePreInspection,
);

module.exports = router;
