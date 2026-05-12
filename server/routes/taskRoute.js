const express = require("express");
const router = express.Router();
const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  cleanupAssignedMechanic,
  deleteTask,
} = require("../controllers/taskController");
const { verifyToken } = require("../middleware/authMiddleware");
const { touchSessionActivity } = require("../middleware/sessionActivity");
const { requireActionConfirmation } = require("../middleware/actionConfirmation");

router.post("/create", verifyToken, touchSessionActivity, requireActionConfirmation, createTask);
router.get("/getAll", verifyToken, getTasks);
router.patch(
  "/cleanup/remove-assigned-mechanic",
  verifyToken,
  touchSessionActivity,
  requireActionConfirmation,
  cleanupAssignedMechanic,
);
router.get("/:id", verifyToken, getTaskById);
router.put("/:id", verifyToken, touchSessionActivity, requireActionConfirmation, updateTask);
router.delete("/:id", verifyToken, touchSessionActivity, requireActionConfirmation, deleteTask);

module.exports = router;
