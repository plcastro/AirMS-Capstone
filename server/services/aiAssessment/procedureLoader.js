const ManualProcedure = require("../../models/manualProcedureModel");
const PROCEDURE_ACTION_CATALOG = require("./procedureActionCatalog.json");

const sanitizeProcedure = (procedure = {}) => ({
  reference: String(procedure.reference || "").trim(),
  title: String(procedure.title || "")
    .replace(/\s+Modified content\.?$/i, "")
    .trim(),
  sourceFile: procedure.sourceFile || "",
  notices: Array.isArray(procedure.notices) ? procedure.notices : [],
  jobSetupActions: Array.isArray(procedure.jobSetupActions)
    ? procedure.jobSetupActions
    : [],
  procedureActions: Array.isArray(procedure.procedureActions)
    ? procedure.procedureActions
    : [],
  closeUpActions: Array.isArray(procedure.closeUpActions)
    ? procedure.closeUpActions
    : [],
  criteria: Array.isArray(procedure.criteria) ? procedure.criteria : [],
  exactSteps: Array.isArray(procedure.exactSteps) ? procedure.exactSteps : [],
  active: procedure.active !== false,
});

const DEFAULT_MANUAL_PROCEDURES = (PROCEDURE_ACTION_CATALOG.entries || [])
  .map(sanitizeProcedure)
  .filter((procedure) => procedure.reference);

const getManualProcedures = async () => {
  const storedProcedures = await ManualProcedure.find({ active: true }).lean();

  if (!storedProcedures.length) {
    return DEFAULT_MANUAL_PROCEDURES;
  }

  return storedProcedures.map(sanitizeProcedure);
};

module.exports = {
  getManualProcedures,
  sanitizeProcedure,
  DEFAULT_MANUAL_PROCEDURES,
};
