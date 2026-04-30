const ManualRule = require("../models/manualRuleModel");
const { buildMaintenanceInsights } = require("../services/aiAssessment/assessmentService");
const { DEFAULT_MANUAL_RULES } = require("../services/aiAssessment/ruleLoader");
const { auditLog } = require("./logsController");
const MaintenanceLog = require("../models/maintenanceLogModel");
const AiRectification = require("../models/aiRectificationModel");
const {
  getGeminiConfig,
  getGeminiCooldown,
  getLastGeminiResult,
} = require("../services/aiAssessment/llmExplainer");

const getMaintenanceInsights = async (req, res) => {
  try {
    const includeLLMSummary = String(req.query.includeLLMSummary || "") === "1";
    const llmLimit = Number.parseInt(String(req.query.llmLimit || "0"), 10);
    const insights = await buildMaintenanceInsights({
      includeLLMSummary,
      llmLimit: Number.isFinite(llmLimit) ? llmLimit : 0,
    });

    const summary = insights.reduce(
      (accumulator, insight) => {
        accumulator.totalAircraft += 1;
        accumulator[insight.riskLevel.toLowerCase()] += 1;
        return accumulator;
      },
      {
        totalAircraft: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
    );
    const geminiSummaryCount = insights.filter(
      (insight) => insight.managerSummarySource === "gemini",
    ).length;
    const llmEligibleCount = insights.filter(
      (insight) => (insight.matchedRules || []).length > 0,
    ).length;
    const cooldown = getGeminiCooldown();

    res.status(200).json({
      success: true,
      data: insights,
      meta: {
        summary,
        llmEnabled: Boolean(getGeminiConfig().apiKey),
        activeModel: getGeminiConfig().model,
        llmLimitApplied:
          includeLLMSummary && Number.isFinite(llmLimit) ? Math.max(0, llmLimit) : 0,
        llmEligibleCount,
        geminiSummaryCount,
        geminiCooldown: cooldown,
        geminiLastResult: getLastGeminiResult(),
      },
    });
  } catch (error) {
    console.error("Error fetching AI maintenance insights:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate AI maintenance insights",
      error: error.message,
    });
  }
};

const getManualRules = async (req, res) => {
  try {
    const storedRules = await ManualRule.find({ active: true }).sort({ ruleCode: 1 }).lean();
    const data = storedRules.length ? storedRules : DEFAULT_MANUAL_RULES;

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching manual rules:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch AI rules",
      error: error.message,
    });
  }
};

const saveManualRules = async (req, res) => {
  try {
    const rules = Array.isArray(req.body?.rules) ? req.body.rules : [];

    if (!rules.length) {
      await ManualRule.updateMany({}, { active: false });

      return res.status(200).json({
        success: true,
        message: "All AI rules cleared successfully",
        data: [],
      });
    }

    await Promise.all(
      rules.map((rule) =>
        ManualRule.findOneAndUpdate(
          { ruleCode: rule.ruleCode },
          { ...rule, active: rule.active !== false },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
            runValidators: true,
          },
        ),
      ),
    );

    const savedRules = await ManualRule.find({ active: true }).sort({ ruleCode: 1 }).lean();

    res.status(200).json({
      success: true,
      message: "AI rules saved successfully",
      data: savedRules,
    });
  } catch (error) {
    console.error("Error saving manual rules:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save AI rules",
      error: error.message,
    });
  }
};

const getLLMHealth = async (req, res) => {
  const { apiKey, model } = getGeminiConfig();
  const hasApiKey = Boolean(apiKey);
  const cooldown = getGeminiCooldown();

  if (!hasApiKey) {
    return res.status(200).json({
      success: true,
      configured: false,
      reachable: false,
      model,
      message: "GEMINI_API_KEY or GOOGLE_API_KEY is not configured on the server",
    });
  }

  return res.status(200).json({
    success: true,
    configured: true,
    reachable: !cooldown.active,
    cooldown,
    lastResult: getLastGeminiResult(),
    model,
    message: cooldown.active
      ? cooldown.message || `Gemini is cooling down for ${cooldown.retryAfterSeconds} seconds`
      : "Gemini is configured. Health check does not call Gemini to avoid using quota.",
  });
};

const createRectificationTask = async (req, res) => {
  try {
    const draft = req.body || {};

    if (!draft.aircraft || !draft.issueTitle) {
      return res.status(400).json({
        success: false,
        message: "Aircraft and finding are required to mark the issue rectified",
      });
    }

    const rectifiedAt = new Date();
    const matchedRuleCodes = Array.isArray(draft.matchedRuleCodes)
      ? draft.matchedRuleCodes.filter(Boolean)
      : [];
    const correctiveActionDone = [
      "Marked rectified from AI Maintenance Tracking.",
      draft.recommendedAction,
      draft.procedureSummary,
    ]
      .filter(Boolean)
      .join("\n\n");

    const rectification = await AiRectification.create({
      aircraft: draft.aircraft,
      issueTitle: draft.issueTitle,
      component: draft.component || "",
      riskLevel: draft.riskLevel || "",
      matchedRuleCodes,
      rectifiedAt,
      rectifiedBy: req.user?.id || null,
      status: "active",
    });

    await MaintenanceLog.updateMany(
      {
        aircraft: draft.aircraft,
        $or: [
          { dateDefectRectified: { $exists: false } },
          { dateDefectRectified: null },
          { status: { $ne: "verified" } },
        ],
      },
      {
        $set: {
          dateDefectRectified: rectifiedAt,
          correctiveActionDone,
          status: "verified",
        },
      },
    );

    await MaintenanceLog.create({
      sourceTaskId: `AI-RECTIFIED-${rectification._id}`,
      taskTitle: "AI maintenance finding rectified",
      sourceTaskStatus: "rectified",
      aircraft: draft.aircraft,
      defects: draft.issueTitle,
      dateDefectDiscovered: rectifiedAt,
      correctiveActionDone,
      workDetails: [
        {
          description: draft.issueTitle,
        },
      ],
      workDetailsLocked: true,
      dateDefectRectified: rectifiedAt,
      reportedBy: req.user?.username || req.user?.id || "AI Maintenance Tracking",
      status: "verified",
    });

    await auditLog(
      `AI maintenance finding rectified: ${draft.aircraft} - ${draft.issueTitle}`,
      req.user?.id || null,
    );

    return res.status(201).json({
      success: true,
      message: "Maintenance finding marked rectified",
      data: rectification,
    });
  } catch (error) {
    console.error("Error marking AI maintenance finding rectified:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark maintenance finding rectified",
      error: error.message,
    });
  }
};

module.exports = {
  getMaintenanceInsights,
  getManualRules,
  saveManualRules,
  getLLMHealth,
  createRectificationTask,
};
