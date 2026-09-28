const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { touchSessionActivity } = require("../middleware/sessionActivity");
const { requireActionConfirmation } = require("../middleware/actionConfirmation");
const workflow = require('../controllers/flightInspectionWorkflowController');
const {
  createPostInspection,
  getAllPostInspections,
  getPostInspectionById,
  updatePostInspection,
  deletePostInspection,
} = require("../controllers/postInspectionController");

router.use(verifyToken);

router.post(
  "/createPostInspection",
  touchSessionActivity,
  requireActionConfirmation,
  workflow.createLegacy,
);
router.get("/getAllPostInspection", getAllPostInspections);
router.get("/getPostInspectionById/:id", getPostInspectionById);
router.put(
  "/updatePostInspectionById/:id",
  touchSessionActivity,
  requireActionConfirmation,
  workflow.edit('post'),
);
router.delete(
  "/deletePostInspectionById/:id",
  touchSessionActivity,
  requireActionConfirmation,
  workflow.remove,
);

module.exports = router;
