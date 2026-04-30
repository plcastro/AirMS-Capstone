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

const EMPTY_DEFECT_DETAILS = {
  defectType: "",
  symptom: "",
  affectedComponent: "",
  maintenanceMeaning: "",
  confidence: "low",
};

let geminiCooldownUntil = 0;
let geminiCooldownMessage = "";
let lastGeminiResult = {
  ok: true,
  reason: "",
  status: 0,
  message: "",
  model: "",
  checkedAt: "",
};

const setLastGeminiResult = (result = {}) => {
  lastGeminiResult = {
    ok: Boolean(result.ok),
    reason: result.reason || "",
    status: Number(result.status) || 0,
    message: result.message || "",
    model: result.model || getGeminiConfig().model || "",
    checkedAt: new Date().toISOString(),
  };
};

const getLastGeminiResult = () => lastGeminiResult;

const getGeminiCooldown = () => {
  const remainingMs = Math.max(0, geminiCooldownUntil - Date.now());

  return {
    active: remainingMs > 0,
    retryAfterSeconds: Math.ceil(remainingMs / 1000),
    message: remainingMs > 0 ? geminiCooldownMessage : "",
    cooldownUntil: remainingMs > 0 ? new Date(geminiCooldownUntil).toISOString() : "",
  };
};

const parseRetryAfterSeconds = (response, result = {}) => {
  const retryAfterHeader = Number.parseInt(
    response.headers?.get?.("retry-after") || "",
    10,
  );

  if (Number.isFinite(retryAfterHeader) && retryAfterHeader > 0) {
    return retryAfterHeader;
  }

  const message = String(result?.error?.message || "");
  const retryMatch = message.match(/retry in\s+([\d.]+)s/i);

  if (retryMatch) {
    const retrySeconds = Number.parseFloat(retryMatch[1]);
    if (Number.isFinite(retrySeconds) && retrySeconds > 0) {
      return Math.ceil(retrySeconds);
    }
  }

  return 60;
};

const setGeminiCooldown = (seconds, message = "") => {
  const paddedSeconds = Math.max(5, Number(seconds) || 60) + 2;
  geminiCooldownUntil = Date.now() + paddedSeconds * 1000;
  geminiCooldownMessage =
    message ||
    `Gemini quota is cooling down. Try again in ${paddedSeconds} seconds.`;
};

const buildDefectDetailsPrompt = (insight = {}) =>
  [
    "You are extracting structured aircraft maintenance defect details.",
    "Return only valid JSON. Do not include markdown.",
    "Do not invent facts. If a field is not stated, use an empty string.",
    "Do not change the rule risk, AMM reference, or recommended action.",
    "Use confidence high only when the source text explicitly states the defect or symptom.",
    "",
    `Aircraft: ${getAircraftLabel(insight)}`,
    `Rule issue: ${insight.issueTitle || ""}`,
    `Rule component: ${insight.component || ""}`,
    `Risk: ${insight.riskLevel || ""}`,
    `Recommended action: ${insight.recommendedAction || ""}`,
    `AMM references: ${(insight.manualReferences || []).join(" | ")}`,
    `Matched rules: ${(insight.matchedRules || []).map((rule) => rule.ruleCode).join(", ")}`,
    "Source text snippets:",
    ...(insight.sourceSnippets || []).slice(0, 5).map((item, index) =>
      `${index + 1}. [${item.source || "record"}] ${item.text || ""}`,
    ),
    "",
    "Return this exact JSON shape:",
    JSON.stringify(EMPTY_DEFECT_DETAILS, null, 2),
  ].join("\n");

const buildCombinedPrompt = (insight = {}) =>
  [
    "You are helping an aircraft maintenance manager understand a rule-matched maintenance finding.",
    "Return only valid JSON. Do not include markdown.",
    "Do not invent facts or references.",
    "Use the rule-provided risk as a fixed input.",
    "Write managerSummary as 1 short paragraph that is consistent with the rule-provided recommendation.",
    "Extract defectDetails only from the source text snippets.",
    "Do not create new maintenance actions, intervals, limits, parts, or AMM references.",
    "If source snippets are vague, say the rule matched from current records and keep the explanation conservative.",
    "The application will choose recommendedAction and manualReferences from matched rules after your response.",
    "",
    `Aircraft: ${getAircraftLabel(insight)}`,
    `Risk: ${insight.riskLevel || ""}`,
    `Issue: ${insight.issueTitle || ""}`,
    `Finding: ${insight.shortFinding || ""}`,
    `Rule recommended action: ${insight.recommendedAction || ""}`,
    `Rule AMM references: ${(insight.manualReferences || []).join(" | ")}`,
    `Exact AMM procedure: ${insight.procedureReference || ""} ${insight.procedureTitle || ""}`.trim(),
    `Procedure summary: ${insight.procedureSummary || ""}`,
    `Matched rules: ${(insight.matchedRules || []).map((rule) => rule.ruleCode).join(", ")}`,
    "Source text snippets:",
    ...(insight.sourceSnippets || []).slice(0, 5).map((item, index) =>
      `${index + 1}. [${item.source || "record"}] ${item.text || ""}`,
    ),
    "",
    "Return this exact JSON shape:",
    JSON.stringify(
      {
        managerSummary: "",
        defectDetails: EMPTY_DEFECT_DETAILS,
      },
      null,
      2,
    ),
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

const generateGeminiText = async (prompt, { maxOutputTokens = 120, temperature = 0.3 } = {}) => {
  const { apiKey, model } = getGeminiConfig();
  const cooldown = getGeminiCooldown();

  if (!apiKey) {
    setLastGeminiResult({
      ok: false,
      reason: "not_configured",
      message: "GEMINI_API_KEY or GOOGLE_API_KEY is not configured.",
      model,
    });
    return null;
  }

  if (!model) {
    setLastGeminiResult({
      ok: false,
      reason: "model_missing",
      message: "GEMINI_MODEL is not configured.",
      model,
    });
    return null;
  }

  if (typeof fetch !== "function") {
    setLastGeminiResult({
      ok: false,
      reason: "fetch_unavailable",
      message: "Node fetch is unavailable in this runtime.",
      model,
    });
    return null;
  }

  if (cooldown.active) {
    setLastGeminiResult({
      ok: false,
      reason: "cooldown",
      message: cooldown.message,
      model,
    });
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
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens,
          temperature,
        },
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage =
        result?.error?.message || `Gemini returned HTTP ${response.status}.`;
      if (response.status === 429) {
        setGeminiCooldown(
          parseRetryAfterSeconds(response, result),
          errorMessage || "Gemini quota exceeded.",
        );
      }
      setLastGeminiResult({
        ok: false,
        reason: response.status === 429 ? "quota" : "http_error",
        status: response.status,
        message: errorMessage,
        model,
      });
      return null;
    }

    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text) {
      setLastGeminiResult({
        ok: false,
        reason: "empty_response",
        status: response.status,
        message:
          result?.candidates?.[0]?.finishReason ||
          result?.promptFeedback?.blockReason ||
          "Gemini returned no text.",
        model,
      });
      return null;
    }

    setLastGeminiResult({
      ok: true,
      reason: "ok",
      status: response.status,
      message: `Gemini returned ${text.length} characters.`,
      model,
    });
    return text;
  } catch (error) {
    setLastGeminiResult({
      ok: false,
      reason: "request_failed",
      message: error.message,
      model,
    });
    return null;
  }
};

const summarizeInsightWithLLM = async (insight) => {
  const text = await generateGeminiText(buildPrompt(insight), {
    maxOutputTokens: 120,
    temperature: 0.3,
  });

  return text ? normalizeLlmSummary(text, insight) : null;
};

const parseJsonObject = (value = "") => {
  try {
    const text = String(value || "").trim();
    const jsonText = text.match(/\{[\s\S]*\}/)?.[0] || text;
    const parsed = JSON.parse(jsonText);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    return parsed;
  } catch (error) {
    return null;
  }
};

const normalizeDefectDetails = (details = {}) => {
  const confidence = String(details.confidence || "low").toLowerCase();
  const normalizedConfidence = ["low", "medium", "high"].includes(confidence)
    ? confidence
    : "low";

  return {
    defectType: String(details.defectType || "").trim(),
    symptom: String(details.symptom || "").trim(),
    affectedComponent: String(details.affectedComponent || "").trim(),
    maintenanceMeaning: String(details.maintenanceMeaning || "").trim(),
    confidence: normalizedConfidence,
  };
};

const extractDefectDetailsWithLLM = async (insight) => {
  if (
    !(insight.sourceSnippets || []).length ||
    !(insight.matchedRules || []).length
  ) {
    return null;
  }

  const text = await generateGeminiText(buildDefectDetailsPrompt(insight), {
    maxOutputTokens: 220,
    temperature: 0,
  });
  const parsed = parseJsonObject(text);

  return parsed ? normalizeDefectDetails(parsed) : null;
};

const enrichInsightWithLLM = async (insight) => {
  if (!(insight.matchedRules || []).length) {
    return null;
  }

  const text = await generateGeminiText(buildCombinedPrompt(insight), {
    maxOutputTokens: 360,
    temperature: 0.2,
  });
  const parsed = parseJsonObject(text);

  if (!parsed) {
    setLastGeminiResult({
      ok: false,
      reason: text ? "invalid_json" : getLastGeminiResult().reason,
      message: text
        ? "Gemini returned text, but it was not valid JSON for the expected summary shape."
        : getLastGeminiResult().message,
      model: getGeminiConfig().model,
    });
    return null;
  }

  return {
    managerSummary: parsed.managerSummary
      ? normalizeLlmSummary(parsed.managerSummary, insight)
      : "",
    defectDetails: parsed.defectDetails
      ? normalizeDefectDetails(parsed.defectDetails)
      : null,
  };
};

module.exports = {
  summarizeInsightWithLLM,
  extractDefectDetailsWithLLM,
  enrichInsightWithLLM,
  getGeminiConfig,
  getGeminiCooldown,
  getLastGeminiResult,
  normalizeLlmSummary,
};
