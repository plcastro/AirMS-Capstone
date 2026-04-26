const ManualRule = require("../models/manualRuleModel");
const { buildMaintenanceInsights } = require("../services/aiAssessment/assessmentService");
const { DEFAULT_MANUAL_RULES } = require("../services/aiAssessment/ruleLoader");
const { getGeminiConfig } = require("../services/aiAssessment/llmExplainer");

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

    res.status(200).json({
      success: true,
      data: insights,
      meta: {
        summary,
        llmEnabled: Boolean(getGeminiConfig().apiKey),
        activeModel: getGeminiConfig().model,
        llmLimitApplied:
          includeLLMSummary && Number.isFinite(llmLimit) ? Math.max(0, llmLimit) : 0,
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

  if (!hasApiKey) {
    return res.status(200).json({
      success: true,
      configured: false,
      reachable: false,
      model,
      message: "GEMINI_API_KEY or GOOGLE_API_KEY is not configured on the server",
    });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: "Reply with exactly: OK" }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 16,
          temperature: 0,
        },
      }),
    },
    );

    const result = await response.json().catch(() => ({}));
    const outputText = result?.candidates?.[0]?.content?.parts?.[0]?.text
      ? String(result.candidates[0].content.parts[0].text).trim()
      : "";

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        configured: true,
        reachable: false,
        model,
        message: result?.error?.message || "Gemini health check failed",
      });
    }

    return res.status(200).json({
      success: true,
      configured: true,
      reachable: true,
      model,
      message: "Gemini API key is working",
      responsePreview: outputText || "No output text returned",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      configured: true,
      reachable: false,
      model,
      message: error.message || "Gemini health check failed",
    });
  }
};

module.exports = {
  getMaintenanceInsights,
  getManualRules,
  saveManualRules,
  getLLMHealth,
};
