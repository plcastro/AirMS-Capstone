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
    B412_PRE_INSPECTION_CHECK_KEYS.map((key) => [
      key,
      source[key] === true,
    ]),
  );
};

export const createEmptyB412PreInspectionData = (value = {}) => ({
  checks: createEmptyB412PreInspectionChecks(value),
});

export const areAllB412PreInspectionChecksComplete = (value = {}) => {
  const checks = getChecksSource(value);

  return B412_PRE_INSPECTION_CHECK_KEYS.every((key) => checks[key] === true);
};

const normalizeAircraftType = (aircraftType = "") =>
  String(aircraftType || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

export const isB412Aircraft = (aircraftType = "") => {
  const normalized = normalizeAircraftType(aircraftType);

  return normalized.includes("B412EP") || normalized.includes("BELL412EP");
};

export const isAS350Aircraft = (aircraftType = "") =>
  normalizeAircraftType(aircraftType).includes("AS350B3");

