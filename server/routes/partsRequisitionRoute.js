const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { touchSessionActivity } = require("../middleware/sessionActivity");
const { requireActionConfirmation } = require("../middleware/actionConfirmation");
const {
  getAllRequisitions,
  getRequisitionById,
  createRequisition,
  updateRequisitionStatus,
} = require("../controllers/partsRequisitionController");

router.get("/get-all-requisition", getAllRequisitions);
router.get("/get-requisition-by-id/:id", getRequisitionById);
router.post(
  "/create-requisition",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  createRequisition,
);
router.post(
  "/update-requisition/:id",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  updateRequisitionStatus,
);

module.exports = router;
