const checklist = require("../../shared/b412PreInspectionChecklist.json");

const B412_PRE_INSPECTION_CHECK_KEYS = Object.freeze(
  checklist.sections.flatMap((section) =>
    section.items.map((item) => item.key),
  ),
);

const B412_PRE_INSPECTION_CHECK_KEY_SET = new Set(
  B412_PRE_INSPECTION_CHECK_KEYS,
);

const normalizeAircraftType = (aircraftType = "") =>
  String(aircraftType)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const isB412AircraftType = (aircraftType = "") => {
  const normalized = normalizeAircraftType(aircraftType);
  return normalized.includes("B412EP") || normalized.includes("BELL412EP");
};

const isAS350AircraftType = (aircraftType = "") =>
  normalizeAircraftType(aircraftType).includes("AS350B3");

const getB412PreInspectionPayloadShapeError = (b412Data) => {
  if (
    b412Data === undefined ||
    b412Data === null ||
    typeof b412Data !== "object" ||
    Array.isArray(b412Data)
  ) {
    return "b412Data must be an object";
  }

  const checks = b412Data.checks;
  if (
    checks === undefined ||
    checks === null ||
    typeof checks !== "object" ||
    Array.isArray(checks)
  ) {
    return "b412Data.checks must be an object";
  }

  for (const [key, value] of Object.entries(checks)) {
    if (!B412_PRE_INSPECTION_CHECK_KEY_SET.has(key)) {
      return `b412Data.checks contains an unknown checklist key: ${key}`;
    }
    if (typeof value !== "boolean") {
      return `b412Data.checks.${key} must be a boolean`;
    }
  }

  return "";
};

const areAllB412PreInspectionChecksComplete = (record = {}) => {
  const checks = record?.b412Data?.checks || {};
  return B412_PRE_INSPECTION_CHECK_KEYS.every((key) => checks[key] === true);
};

module.exports = {
  B412_PRE_INSPECTION_CHECK_KEYS,
  areAllB412PreInspectionChecksComplete,
  getB412PreInspectionPayloadShapeError,
  isAS350AircraftType,
  isB412AircraftType,
};
