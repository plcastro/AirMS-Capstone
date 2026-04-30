const express = require("express");
const router = express.Router();
const {
  getMaintenanceInsights,
  getManualRules,
  saveManualRules,
  getLLMHealth,
  createRectificationTask,
} = require("../controllers/aiInsightController");
const { verifyToken } = require("../middleware/authMiddleware");

router.get("/health", getLLMHealth);
router.get("/maintenance-tracking", getMaintenanceInsights);
router.post("/rectification-task", verifyToken, createRectificationTask);
router.get("/rules", getManualRules);
router.put("/rules", saveManualRules);

module.exports = router;
