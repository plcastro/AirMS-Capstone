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

router.post("/create", verifyToken, createTask);
router.get("/getAll", verifyToken, getTasks);
router.patch("/cleanup/remove-assigned-mechanic", verifyToken, cleanupAssignedMechanic);
router.get("/:id", verifyToken, getTaskById);
router.put("/:id", verifyToken, updateTask);
router.delete("/:id", verifyToken, deleteTask);

module.exports = router;
