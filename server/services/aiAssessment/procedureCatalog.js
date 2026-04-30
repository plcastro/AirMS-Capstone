const PROCEDURE_ACTION_CATALOG = require("./procedureActionCatalog.json");

const REFERENCE_PATTERN = /AMM\s*\d{2}-\d{2}-\d{2}\s*,\s*\d+-\w+/gi;

const normalizeProcedureReference = (value = "") =>
  String(value || "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ",")
    .replace(/^AMM\s*/, "AMM ")
    .trim();

const extractProcedureReferences = (value = "") =>
  Array.from(String(value || "").matchAll(REFERENCE_PATTERN))
    .map((match) => normalizeProcedureReference(match[0]))
    .filter(Boolean);

const PROCEDURE_BY_REFERENCE = new Map(
  (PROCEDURE_ACTION_CATALOG.entries || []).map((entry) => [
    normalizeProcedureReference(entry.reference),
    entry,
  ]),
);

const buildProcedureMap = (procedures = []) =>
  new Map(
    procedures.map((entry) => [
      normalizeProcedureReference(entry.reference),
      entry,
    ]),
  );

const getProcedureForManualReference = (manualReference = "", procedures = []) => {
  const references = extractProcedureReferences(manualReference);
  const procedureMap = procedures.length
    ? buildProcedureMap(procedures)
    : PROCEDURE_BY_REFERENCE;

  for (const reference of references) {
    const procedure = procedureMap.get(reference);
    if (procedure) {
      return procedure;
    }
  }

  return null;
};

const buildExactProcedureActions = (procedure = null, limit = 8) => {
  if (!procedure) {
    return [];
  }

  const notices = (procedure.notices || [])
    .slice(0, 2)
    .map((notice) => `Observe ${notice}`);
  const steps = (procedure.exactSteps || []).slice(0, limit);
  const criteria = (procedure.criteria || [])
    .slice(0, 3)
    .map((criterion) => `Apply criterion: ${criterion}`);

  return [...notices, ...steps, ...criteria].filter(Boolean);
};

const hasText = (procedure = {}, pattern) => {
  const text = [
    procedure.title,
    ...(procedure.notices || []),
    ...(procedure.exactSteps || []),
    ...(procedure.criteria || []),
  ]
    .join(" ")
    .toLowerCase();

  return pattern.test(text);
};

const buildProcedureSummary = (procedure = null) => {
  if (!procedure) {
    return "";
  }

  const title = procedure.title || "the applicable AMM procedure";
  const actions = [];

  if (hasText(procedure, /fault isolation|fail code|malfunction code|troubleshooting/)) {
    actions.push(
      "start with the listed fault-isolation checks, confirm whether the relevant wiring, connectors, sensors, or control units pass the test, and repair or replace the failed item before clearing the message",
    );
  } else if (hasText(procedure, /overtorque|hard landing|impact|lightning|immersion|turbulence|gust|rotor overspeed|freewheel/)) {
    actions.push(
      "treat the record as an abnormal event, document the event details, inspect the affected assemblies called out by the procedure, and complete any required repair, replacement, overhaul, or reporting action before release",
    );
  } else if (hasText(procedure, /contamination|fuel|oil circuit|fungicide/)) {
    actions.push(
      "apply the required system safety precautions, determine whether contamination is only suspected or confirmed, then use the applicable detection, preventive, or curative treatment path before returning the aircraft to service",
    );
  } else if (hasText(procedure, /inspection criteria|wear|damage|corrosion|crack|debond|blister|swelling/)) {
    actions.push(
      "perform the job setup, inspect the affected component against the AMM damage and wear criteria, then repair, replace, discard, or close the item according to the acceptance limits",
    );
  } else {
    actions.push(
      "complete the job setup, perform the AMM procedure checks in sequence, apply any acceptance or replacement criteria, and finish the close-up before the task is closed",
    );
  }

  if (hasText(procedure, /caution|warning|safety instructions/)) {
    actions.unshift("observe the procedure safety cautions before starting work");
  }

  return `Using ${procedure.reference}: ${title}, ${actions.join(", ")}.`;
};

module.exports = {
  buildExactProcedureActions,
  buildProcedureSummary,
  buildProcedureMap,
  getProcedureForManualReference,
  extractProcedureReferences,
  normalizeProcedureReference,
};
