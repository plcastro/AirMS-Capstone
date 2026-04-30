const fs = require("fs");
const path = require("path");

const inputDir =
  process.argv[2] || path.join(__dirname, "..", "tmp", "manual-ocr");
const outputPath =
  process.argv[3] ||
  path.join(__dirname, "..", "services", "aiAssessment", "procedureActionCatalog.json");

const SECTION_LABELS = [
  "A. Applicable",
  "B. Special",
  "C. Materials",
  "D. Routine",
  "E. Job",
  "F. Procedure",
  "G. Close",
];

const normalizeSpaces = (value = "") =>
  String(value || "")
    .replace(/\r/g, "\n")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const cleanText = (value = "") =>
  normalizeSpaces(value)
    .replace(/=== Page \d+ ===/g, " ")
    .replace(/Printed by guest on \d{4}-\d{2}-\d{2}/g, " ")
    .replace(/H125 - AS350 B2-B3 Rev\.\d+\.\w+/g, " ")
    .replace(/H125 - AS350/g, " ")
    .replace(/O Copyright - Airbus/g, " ")
    .replace(/\b(?:rn|o|z|O)(?:\s+(?:rn|o|z|O)){4,}\b/g, " ")
    .replace(/[�Ü]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getReferenceFromName = (fileName = "") => {
  const baseName = path.basename(fileName, path.extname(fileName));
  return baseName.replace(/^AMM\s+/i, "AMM ");
};

const getTitle = (text = "", reference = "") => {
  const beforeReference = text.split(" REFERENCE ")[0] || "";
  const withoutReference = beforeReference
    .replace(new RegExp(reference.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "")
    .replace(/\bAMM\s+\d{2}-\d{2}-\d{2},\d+-\w+\b/gi, "")
    .trim();

  return withoutReference || reference;
};

const getSectionStart = (text = "", label = "") => {
  const normalizedLabel = label.replace(/\./g, "\\.");
  const match = text.match(new RegExp(`\\b${normalizedLabel}[^A-G]{0,40}`, "i"));
  return match ? match.index : -1;
};

const getSection = (text = "", startLabel = "", endLabels = []) => {
  const start = getSectionStart(text, startLabel);
  if (start < 0) {
    return "";
  }

  let end = text.length;
  endLabels.forEach((label) => {
    const index = getSectionStart(text.slice(start + 1), label);
    if (index >= 0) {
      end = Math.min(end, start + 1 + index);
    }
  });

  return text.slice(start, end).trim();
};

const stripSectionHeader = (text = "") =>
  text
    .replace(/^[A-G]\.\s*[^A-G]{0,80}/, "")
    .replace(/^(Job Set-up|Procedure|Close-up)\b/i, "")
    .trim();

const splitActionText = (text = "") => {
  const prepared = stripSectionHeader(text)
    .replace(/\b([EFG]\.[A-Z0-9]+\.?)/gi, "\n$1")
    .replace(/\s+([a-z]\.)\s+/g, "\n$1 ")
    .replace(/\s+•\s+/g, "\n• ")
    .replace(/\b(CAUTION|WARNING|NOTE)\b/g, "\n$1")
    .replace(/\b(Discard|Replace|Repair|Perform|Check|Remove|Install|Measure|Make|Use|Read|Contact)\b/g, "\n$1");

  return prepared
    .split(/\n+/)
    .map((line) =>
      line
        .replace(/^[EFG]\.\d+\.?\s*/i, "")
        .replace(/^[EFG]\.[A-Z0-9]+\.?\s*/i, "")
        .replace(/^[-•]\s*/, "")
        .replace(/\bAMM\s+\d{2}-\d{2}-\d{2},\d+-\w+\s+B2,B3\b/gi, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((line) => line.length >= 12)
    .filter((line) => !/^figure\s+\d+/i.test(line))
    .filter((line) => !/^table\s+\d+/i.test(line))
    .slice(0, 18);
};

const extractNotices = (text = "") =>
  Array.from(text.matchAll(/\b(CAUTION|WARNING|NOTE)\b\s+(.{20,220}?)(?=\b(?:CAUTION|WARNING|NOTE|[EFG]\.\d+|A\.|B\.|C\.|D\.|E\.|F\.|G\.)\b|$)/gi))
    .map((match) => `${match[1].toUpperCase()}: ${match[2].trim()}`)
    .map((line) => line.replace(/\s+/g, " "))
    .slice(0, 8);

const extractCriteria = (text = "") => {
  const fragments = text
    .replace(/\s+([A-Z][A-Z ]{2,}:)/g, "\n$1")
    .replace(/\s+(Discard|Replace|Repair|Wear|Maximum damage|Damage permitted|None\.|No measures|If an anomaly)/gi, "\n$1")
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) =>
      /discard|replace|repair|wear|damage|permitted|maximum|none|no measures|limit|criteria|satisfactory|not satisfactory|anomal/i.test(
        line,
      ),
    )
    .filter((line) => line.length >= 16)
    .slice(0, 12);

  return Array.from(new Set(fragments));
};

const buildEntry = (filePath) => {
  const fileName = path.basename(filePath);
  const reference = getReferenceFromName(fileName);
  const text = cleanText(fs.readFileSync(filePath, "utf8"));
  const title = getTitle(text, reference);
  const jobSetup = getSection(text, "E. Job", ["F. Procedure", "G. Close"]);
  const procedure = getSection(text, "F. Procedure", ["G. Close"]);
  const closeUp = getSection(text, "G. Close", []);
  const notices = extractNotices(text);
  const jobSetupActions = splitActionText(jobSetup);
  const procedureActions = splitActionText(procedure);
  const closeUpActions = splitActionText(closeUp);
  const criteria = extractCriteria(procedure || text);
  const exactSteps = [
    ...jobSetupActions.map((step) => `Job setup: ${step}`),
    ...procedureActions.map((step) => `Procedure: ${step}`),
    ...closeUpActions.map((step) => `Close-up: ${step}`),
  ].slice(0, 20);
  const fallbackExactSteps = criteria
    .slice(0, 8)
    .map((step) => `Inspection criteria: ${step}`);

  return {
    reference,
    sourceFile: fileName.replace(/\.txt$/i, ".pdf"),
    title,
    notices,
    jobSetupActions,
    procedureActions,
    closeUpActions,
    criteria,
    exactSteps: exactSteps.length ? exactSteps : fallbackExactSteps,
  };
};

const files = fs
  .readdirSync(inputDir)
  .filter((file) => /^AMM .*\.txt$/i.test(file))
  .sort();

const entries = files.map((file) => buildEntry(path.join(inputDir, file)));
const catalog = {
  generatedFrom: "OCR summaries of user-provided AMM PDFs",
  generatedAt: new Date().toISOString(),
  count: entries.length,
  entries,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      outputPath,
      count: entries.length,
      withExactSteps: entries.filter((entry) => entry.exactSteps.length).length,
    },
    null,
    2,
  ),
);
