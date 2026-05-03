const { generateLlmText, getLlmConfig } = require("./aiAssessment/llmExplainer");

const cleanText = (value = "") => String(value || "").replace(/\s+/g, " ").trim();

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const extractJsonBlock = (value = "") => {
  const text = cleanText(value);
  const firstBracket = text.indexOf("{");
  const lastBracket = text.lastIndexOf("}");

  if (firstBracket === -1 || lastBracket === -1 || lastBracket < firstBracket) {
    return null;
  }

  return text.slice(firstBracket, lastBracket + 1);
};

const buildChecklistPrompt = ({ taskTitle = "", aircraft = "", checklistItems = [] }) =>
  [
    "You are an aircraft maintenance records writer.",
    "Rewrite checklist items into concise, natural maintenance-log terminology.",
    "Use professional aviation maintenance phrasing.",
    "Avoid awkward wording and do not force 'removal and installation' unless the item clearly means both.",
    "Examples of good style:",
    "- Inspection of main rotor blade was satisfactorily carried out.",
    "- Carried out installation of hydraulic pump satisfactorily.",
    "- Carried out removal of defective filter element satisfactorily.",
    "- Servicing of transmission oil was satisfactorily carried out.",
    "- Operational check of fuel system was satisfactorily carried out.",
    "Return valid JSON only with this exact shape:",
    '{"workDetails":["...","..."]}',
    `Task title: ${taskTitle || "N/A"}`,
    `Aircraft: ${aircraft || "N/A"}`,
    `Checklist items: ${JSON.stringify(checklistItems)}`,
  ].join("\n");

const normalizeWorkDetails = (value, expectedCount) => {
  if (!Array.isArray(value)) {
    return null;
  }

  const cleaned = value.map((item) => cleanText(item)).filter(Boolean);
  if (!cleaned.length) {
    return null;
  }

  if (expectedCount && cleaned.length !== expectedCount) {
    return null;
  }

  return cleaned;
};

const rewriteChecklistItemsWithAI = async ({ taskTitle, aircraft, checklistItems }) => {
  const items = Array.isArray(checklistItems) ? checklistItems : [];
  if (!items.length) {
    return null;
  }

  const { apiKey } = getLlmConfig();
  if (!apiKey || typeof fetch !== "function") {
    return null;
  }

  const promptChecklist = items.map((item, index) => ({
    index: index + 1,
    taskName: cleanText(item?.taskName),
    inspectionName: cleanText(item?.inspectionName),
    description: cleanText(item?.description),
    correctiveAction: cleanText(item?.correctiveAction),
    component: cleanText(item?.component),
    documentation: cleanText(item?.documentation),
  }));

  try {
    const rawText = await generateLlmText(buildChecklistPrompt({
      taskTitle,
      aircraft,
      checklistItems: promptChecklist,
    }), {
      maxOutputTokens: 600,
      temperature: 0.2,
    });

    if (!rawText) {
      return null;
    }

    const jsonText = extractJsonBlock(rawText);
    const parsed = jsonText ? safeJsonParse(jsonText) : safeJsonParse(rawText);
    return normalizeWorkDetails(parsed?.workDetails, items.length);
  } catch (error) {
    return null;
  }
};

module.exports = {
  rewriteChecklistItemsWithAI,
};
