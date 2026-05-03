const OPENAI_RESPONSES_API_URL = "https://api.openai.com/v1/responses";

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

let llmCooldownUntil = 0;
let llmCooldownMessage = "";
let lastLlmResult = {
  ok: true,
  reason: "",
  status: 0,
  message: "",
  model: "",
  checkedAt: "",
};

const getLlmConfig = () => ({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL || "gpt-5-mini",
});

const setLastLlmResult = (result = {}) => {
  lastLlmResult = {
    ok: Boolean(result.ok),
    reason: result.reason || "",
    status: Number(result.status) || 0,
    message: result.message || "",
    model: result.model || getLlmConfig().model || "",
    checkedAt: new Date().toISOString(),
  };
};

const getLastLlmResult = () => lastLlmResult;

const getLlmCooldown = () => {
  const remainingMs = Math.max(0, llmCooldownUntil - Date.now());

  return {
    active: remainingMs > 0,
    retryAfterSeconds: Math.ceil(remainingMs / 1000),
    message: remainingMs > 0 ? llmCooldownMessage : "",
    cooldownUntil: remainingMs > 0 ? new Date(llmCooldownUntil).toISOString() : "",
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

const setLlmCooldown = (seconds, message = "") => {
  const paddedSeconds = Math.max(5, Number(seconds) || 60) + 2;
  llmCooldownUntil = Date.now() + paddedSeconds * 1000;
  llmCooldownMessage =
    message ||
    `OpenAI quota is cooling down. Try again in ${paddedSeconds} seconds.`;
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

const normalizeLlmSummary = (summary = "", insight = {}) => {
  const aircraftLabel = getAircraftLabel(insight);
  return String(summary || "")
    .trim()
    .replace(/\bFor aircraft RP-C\b/gi, `For aircraft ${aircraftLabel}`)
    .replace(/\baircraft RP-C\b/gi, `aircraft ${aircraftLabel}`);
};

const extractOpenAIText = (result = {}) => {
  if (typeof result.output_text === "string") {
    return result.output_text;
  }

  return (result.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || "")
    .join("");
};

const supportsTemperature = (model = "") =>
  !/^gpt-5/i.test(String(model || ""));

const isGpt5Model = (model = "") => /^gpt-5/i.test(String(model || ""));

const getEffectiveMaxOutputTokens = (model = "", maxOutputTokens = 120) => {
  const requestedTokens = Number(maxOutputTokens) || 120;

  if (!isGpt5Model(model)) {
    return requestedTokens;
  }

  return Math.max(requestedTokens, 1200);
};

const generateLlmText = async (prompt, { maxOutputTokens = 120, temperature = 0.3 } = {}) => {
  const { apiKey, model } = getLlmConfig();
  const cooldown = getLlmCooldown();

  if (!apiKey) {
    setLastLlmResult({
      ok: false,
      reason: "not_configured",
      message: "OPENAI_API_KEY is not configured.",
      model,
    });
    return null;
  }

  if (!model) {
    setLastLlmResult({
      ok: false,
      reason: "model_missing",
      message: "OPENAI_MODEL is not configured.",
      model,
    });
    return null;
  }

  if (typeof fetch !== "function") {
    setLastLlmResult({
      ok: false,
      reason: "fetch_unavailable",
      message: "Node fetch is unavailable in this runtime.",
      model,
    });
    return null;
  }

  if (cooldown.active) {
    setLastLlmResult({
      ok: false,
      reason: "cooldown",
      message: cooldown.message,
      model,
    });
    return null;
  }

  try {
    const response = await fetch(OPENAI_RESPONSES_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: prompt,
        max_output_tokens: getEffectiveMaxOutputTokens(model, maxOutputTokens),
        ...(isGpt5Model(model) ? { reasoning: { effort: "minimal" } } : {}),
        ...(supportsTemperature(model) ? { temperature } : {}),
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage =
        result?.error?.message || `OpenAI returned HTTP ${response.status}.`;
      if (response.status === 429) {
        setLlmCooldown(
          parseRetryAfterSeconds(response, result),
          errorMessage || "OpenAI quota exceeded.",
        );
      }
      setLastLlmResult({
        ok: false,
        reason: response.status === 429 ? "quota" : "http_error",
        status: response.status,
        message: errorMessage,
        model,
      });
      return null;
    }

    const text = extractOpenAIText(result);
    if (!text) {
      setLastLlmResult({
        ok: false,
        reason: "empty_response",
        status: response.status,
        message:
          result?.incomplete_details?.reason ||
          result?.status ||
          result?.incomplete_details?.reason ||
          "OpenAI returned no text.",
        model,
      });
      return null;
    }

    setLastLlmResult({
      ok: true,
      reason: "ok",
      status: response.status,
      message: `OpenAI returned ${text.length} characters.`,
      model,
    });
    return text;
  } catch (error) {
    setLastLlmResult({
      ok: false,
      reason: "request_failed",
      message: error.message,
      model,
    });
    return null;
  }
};

const summarizeInsightWithLLM = async (insight) => {
  const text = await generateLlmText(buildPrompt(insight), {
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

  const text = await generateLlmText(buildDefectDetailsPrompt(insight), {
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

  const text = await generateLlmText(buildCombinedPrompt(insight), {
    maxOutputTokens: 360,
    temperature: 0.2,
  });
  const parsed = parseJsonObject(text);

  if (!parsed) {
    setLastLlmResult({
      ok: false,
      reason: text ? "invalid_json" : getLastLlmResult().reason,
      message: text
        ? "OpenAI returned text, but it was not valid JSON for the expected summary shape."
        : getLastLlmResult().message,
      model: getLlmConfig().model,
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
  generateLlmText,
  getLlmConfig,
  getLlmCooldown,
  getLastLlmResult,
  normalizeLlmSummary,
};
