const FlightLog = require("../models/flightLogModel");

const getInspectionFlightLog = async (record) => {
  const id = record?.flightLogId?._id || record?.flightLogId;
  if (!/^[a-f\d]{24}$/i.test(String(id || ""))) return null;
  return FlightLog.findById(id);
};

const withInspectionCrew = (inspection, flightLog) => {
  const record = typeof inspection?.toObject === "function" ? inspection.toObject() : inspection;
  if (!record) return record;
  const linkedLog = flightLog === undefined ? record.flightLogId : flightLog;
  return {
    ...record,
    flightLogId: linkedLog?._id || record.flightLogId?._id || record.flightLogId || null,
    assignedPilot: linkedLog?.assignedPilot || null,
    assignedMechanic: linkedLog?.assignedMechanic || null,
    flightLogControlNo: linkedLog?.controlNo || "",
  };
};

// Accept schema fields only; clients cannot change links, crew, or database
// operators through a whole-form save.
const pickInspectionUpdates = (body, model) => Object.fromEntries(
  Object.entries(body || {}).filter(([key]) =>
    !key.startsWith("$") && !key.includes(".") &&
    !["_id", "__v", "createdAt", "updatedAt", "createdBy", "dateAdded", "flightLogId", "preInspectionId", "linkedFromPreFlight", "rpc", "aircraftType"].includes(key) &&
    Object.hasOwn(model.schema.paths, key),
  ),
);

module.exports = { getInspectionFlightLog, withInspectionCrew, pickInspectionUpdates };
