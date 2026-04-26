const express = require("express");
const router = express.Router();
const {
  getMaintenanceInsights,
  getManualRules,
  saveManualRules,
  getLLMHealth,
} = require("../controllers/aiInsightController");

router.get("/health", getLLMHealth);
router.get("/maintenance-tracking", getMaintenanceInsights);
router.get("/rules", getManualRules);
router.put("/rules", saveManualRules);

module.exports = router;
