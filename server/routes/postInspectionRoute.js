const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { touchSessionActivity } = require("../middleware/sessionActivity");
const { requireActionConfirmation } = require("../middleware/actionConfirmation");
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
  createPostInspection,
);
router.get("/getAllPostInspection", getAllPostInspections);
router.get("/getPostInspectionById/:id", getPostInspectionById);
router.put(
  "/updatePostInspectionById/:id",
  touchSessionActivity,
  requireActionConfirmation,
  updatePostInspection,
);
router.delete(
  "/deletePostInspectionById/:id",
  touchSessionActivity,
  requireActionConfirmation,
  deletePostInspection,
);

module.exports = router;
