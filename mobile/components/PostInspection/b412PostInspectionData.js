import b412PostInspectionChecklist from "../../../shared/b412PostInspectionChecklist.json";

export const B412_POST_INSPECTION_DEFINITION = b412PostInspectionChecklist;

export const B412_POST_INSPECTION_SECTIONS =
  B412_POST_INSPECTION_DEFINITION.sections;

export const B412_POST_INSPECTION_CHECK_KEYS =
  B412_POST_INSPECTION_SECTIONS.flatMap((section) =>
    section.items.map((item) => item.key),
  );

export const B412_POST_INSPECTION_SECTION_BY_KEY = Object.fromEntries(
  B412_POST_INSPECTION_SECTIONS.map((section) => [section.key, section]),
);

const getChecksSource = (value = {}) => {
  if (
    value?.checks &&
    typeof value.checks === "object" &&
    !Array.isArray(value.checks)
  ) {
    return value.checks;
  }

  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
};

export const createEmptyB412PostInspectionChecks = (value = {}) => {
  const source = getChecksSource(value);

  return Object.fromEntries(
    B412_POST_INSPECTION_CHECK_KEYS.map((key) => [key, source[key] === true]),
  );
};

export const createEmptyB412PostInspectionData = (value = {}) => ({
  checks: createEmptyB412PostInspectionChecks(value),
});

export const areAllB412PostInspectionChecksComplete = (value = {}) => {
  const checks = getChecksSource(value);

  return B412_POST_INSPECTION_CHECK_KEYS.every((key) => checks[key] === true);
};

export const countCompletedB412PostInspectionChecks = (value = {}) => {
  const checks = getChecksSource(value);

  return B412_POST_INSPECTION_CHECK_KEYS.reduce(
    (count, key) => count + (checks[key] === true ? 1 : 0),
    0,
  );
};

export const normalizePostInspectionAircraftType = (aircraftType = "") =>
  String(aircraftType || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

export const isB412PostInspectionAircraft = (aircraftType = "") => {
  const normalized = normalizePostInspectionAircraftType(aircraftType);

  return normalized.includes("B412EP") || normalized.includes("BELL412EP");
};

export const isAS350PostInspectionAircraft = (aircraftType = "") =>
  normalizePostInspectionAircraftType(aircraftType).includes("AS350B3");

export const isB412Aircraft = isB412PostInspectionAircraft;
export const isAS350Aircraft = isAS350PostInspectionAircraft;
