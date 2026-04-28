const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

const getAircraftLabel = (insight = {}) =>
  insight.aircraft || insight.aircraftId || "the aircraft";

const buildPrompt = (insight = {}) =>
  [
    "You are generating a concise aircraft maintenance tracking summary.",
    "Write 1 short paragraph in plain language for a maintenance manager.",
    "Do not repeat the Issue or Finding text verbatim.",
    "Focus on the maintenance action, AMM direction, and why it matters operationally.",
    "Do not invent facts or references.",
    `Use this exact aircraft registration if you mention it: ${getAircraftLabel(insight)}`,
    `Risk: ${insight.riskLevel}`,
    `Issue: ${insight.issueTitle}`,
    `Finding: ${insight.shortFinding}`,
    `Recommended action: ${insight.recommendedAction}`,
    `Matched rules: ${(insight.matchedRules || []).map((rule) => rule.ruleCode).join(", ")}`,
  ].join("\n");

const getGeminiConfig = () => ({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
  model: process.env.GEMINI_MODEL,
});

const normalizeLlmSummary = (summary = "", insight = {}) => {
  const aircraftLabel = getAircraftLabel(insight);
  return String(summary || "")
    .trim()
    .replace(/\bFor aircraft RP-C\b/gi, `For aircraft ${aircraftLabel}`)
    .replace(/\baircraft RP-C\b/gi, `aircraft ${aircraftLabel}`);
};

const summarizeInsightWithLLM = async (insight) => {
  const { apiKey, model } = getGeminiConfig();

  if (!apiKey || typeof fetch !== "function") {
    return null;
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}/${model}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: buildPrompt(insight),
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 120,
          temperature: 0.3,
        },
      }),
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ? normalizeLlmSummary(text, insight) : null;
  } catch (error) {
    return null;
  }
};

module.exports = {
  summarizeInsightWithLLM,
  getGeminiConfig,
  normalizeLlmSummary,
};
