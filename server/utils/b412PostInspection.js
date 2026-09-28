const checklist = require("../../shared/b412PostInspectionChecklist.json");

const B412_POST_INSPECTION_CHECK_KEYS = Object.freeze(
  checklist.sections.flatMap((section) =>
    section.items.map((item) => item.key),
  ),
);

const B412_POST_INSPECTION_CHECK_KEY_SET = new Set(
  B412_POST_INSPECTION_CHECK_KEYS,
);

const B412_POST_INSPECTION_DATA_KEYS = new Set(["checks"]);

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

const toPlainObject = (value) =>
  typeof value?.toObject === "function" ? value.toObject() : value;

const getB412PostInspectionPayloadShapeError = (b412Data) => {
  const data = toPlainObject(b412Data);

  if (
    data === undefined ||
    data === null ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    return "b412Data must be an object";
  }

  for (const key of Object.keys(data)) {
    if (!B412_POST_INSPECTION_DATA_KEYS.has(key)) {
      return `b412Data contains an unknown key: ${key}`;
    }
  }

  const checks = toPlainObject(data.checks);
  if (
    checks === undefined ||
    checks === null ||
    typeof checks !== "object" ||
    Array.isArray(checks)
  ) {
    return "b412Data.checks must be an object";
  }

  for (const [key, value] of Object.entries(checks)) {
    if (!B412_POST_INSPECTION_CHECK_KEY_SET.has(key)) {
      return `b412Data.checks contains an unknown checklist key: ${key}`;
    }
    if (typeof value !== "boolean") {
      return `b412Data.checks.${key} must be a boolean`;
    }
  }

  return "";
};

const areAllB412PostInspectionChecksComplete = (record = {}) => {
  const checks = toPlainObject(record?.b412Data?.checks) || {};
  return B412_POST_INSPECTION_CHECK_KEYS.every(
    (key) => checks[key] === true,
  );
};

module.exports = {
  B412_POST_INSPECTION_CHECK_KEYS,
  areAllB412PostInspectionChecksComplete,
  getB412PostInspectionPayloadShapeError,
  isAS350AircraftType,
  isB412AircraftType,
};
