const express = require("express");
const router = express.Router();
const {
  createTask,
  getTasks,
  getTaskSummary,
  getBaseMaintenanceAnalytics,
  getTaskById,
  updateTask,
  cleanupAssignedMechanic,
  deleteTask,
} = require("../controllers/taskController");
const { verifyToken } = require("../middleware/authMiddleware");
const { touchSessionActivity } = require("../middleware/sessionActivity");
const { requireActionConfirmation } = require("../middleware/actionConfirmation");
const { requirePermission } = require('../middleware/permissions');
const permissions = require('../config/permissions');
const qualificationService = require('../services/qualificationEngine/taskQualificationService').createTaskQualificationService();

router.get('/qualified-mechanics', verifyToken, requirePermission(permissions.MECHANICS_ASSIGN), async (req, res) => {
  try { res.json({ data: await qualificationService.list(req.query.aircraft) }); }
  catch (error) { res.status(error.status || 500).json({ message: error.message }); }
});

router.post("/create", verifyToken, touchSessionActivity, requireActionConfirmation, createTask);
router.get("/getAll", verifyToken, getTasks);
router.get("/summary", verifyToken, getTaskSummary);
router.get("/analytics/base-maintenance", verifyToken, getBaseMaintenanceAnalytics);
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
