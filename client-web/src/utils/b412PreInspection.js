import b412PreInspectionChecklist from "../../../shared/b412PreInspectionChecklist.json";

export const B412_PRE_INSPECTION_DEFINITION = b412PreInspectionChecklist;

export const B412_PRE_INSPECTION_SECTIONS =
  B412_PRE_INSPECTION_DEFINITION.sections;

export const B412_PRE_INSPECTION_CHECK_KEYS =
  B412_PRE_INSPECTION_SECTIONS.flatMap((section) =>
    section.items.map((item) => item.key),
  );

export const B412_PRE_INSPECTION_SECTION_BY_KEY = Object.fromEntries(
  B412_PRE_INSPECTION_SECTIONS.map((section) => [section.key, section]),
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

export const createEmptyB412PreInspectionChecks = (value = {}) => {
  const source = getChecksSource(value);

  return Object.fromEntries(
    B412_PRE_INSPECTION_CHECK_KEYS.map((key) => [key, source[key] === true]),
  );
};

export const createEmptyB412PreInspectionData = (value = {}) => ({
  checks: createEmptyB412PreInspectionChecks(value),
});

export const areAllB412ChecksComplete = (value = {}) => {
  const checks = getChecksSource(value);

  return B412_PRE_INSPECTION_CHECK_KEYS.every((key) => checks[key] === true);
};

export const areAllB412PreInspectionChecksComplete =
  areAllB412ChecksComplete;

export const countCompletedB412PreInspectionChecks = (value = {}) => {
  const checks = getChecksSource(value);

  return B412_PRE_INSPECTION_CHECK_KEYS.reduce(
    (count, key) => count + (checks[key] === true ? 1 : 0),
    0,
  );
};

export const isB412Aircraft = (aircraftType = "") => {
  const normalized = String(aircraftType || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  return normalized.includes("B412EP") || normalized.includes("BELL412EP");
};

export const isB412PreInspectionAircraft = isB412Aircraft;

