const { getGeminiConfig } = require("./aiAssessment/llmExplainer");

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

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

  const { apiKey, model } = getGeminiConfig();
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
                text: buildChecklistPrompt({
                  taskTitle,
                  aircraft,
                  checklistItems: promptChecklist,
                }),
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 600,
          temperature: 0.2,
        },
      }),
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json().catch(() => null);
    const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
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
