const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { touchSessionActivity } = require("../middleware/sessionActivity");
const { requireActionConfirmation } = require("../middleware/actionConfirmation");
const {
  createApproval,
  getAllApprovals,
  getApprovalById,
  updateApproval,
  deleteApproval,
} = require("../controllers/approveTechnicalLogController");

router.post(
  "/createApproval",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  createApproval,
);
router.get("/getAllApprovals", getAllApprovals);
router.get("/getApprovalById/:id", getApprovalById);
router.put(
  "/updateApprovalById/:id",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  updateApproval,
);
router.delete(
  "/deleteApprovalById/:id",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  deleteApproval,
);

module.exports = router;
