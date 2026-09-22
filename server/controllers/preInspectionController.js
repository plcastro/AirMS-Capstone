const PreInspection = require("../models/preInspectionModel");
const PostInspection = require("../models/postInspectionModel");
const { isAssignedFlightCrew, getAssignedCrewField, CREW_ACCESS_MESSAGE } = require("../../shared/flightCrewAccess");
const { getInspectionFlightLog, withInspectionCrew, pickInspectionUpdates } = require("../utils/inspectionFlightCrew");
const {
  createPreInspectionNotifications,
} = require("../utils/preInspectionNotificationService");
const { auditLog } = require("./logsController");
const {
  areAllB412PreInspectionChecksComplete,
  getB412PreInspectionPayloadShapeError,
  isAS350AircraftType,
  isB412AircraftType,
} = require("../utils/b412PreInspection");
const getAuditActorId = (req, fallbackId = null) => req.user?.id || fallbackId;
const withActorId = (req, action, fallbackId = null) => {
  const actorId = getAuditActorId(req, fallbackId);
  return {
    actorId,
    action: actorId ? `${action} (actorId: ${actorId})` : action,
  };
};

const LEGACY_PRE_INSPECTION_CHECK_FIELDS = Object.entries(
  PreInspection.schema.paths,
)
  .filter(
    ([field, schemaType]) =>
      schemaType.instance === "Boolean" && !field.startsWith("b412Data."),
  )
  .map(([field]) => field);

const normalizeStatus = (value) => String(value || "").trim().toLowerCase();

const hasValidFob = (record = {}) => {
  const value = String(record.fob ?? "").trim();
  if (!value) return false;

  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0;
};

const areAllReleaseChecksComplete = (record = {}) => {
  if (isB412AircraftType(record.aircraftType)) {
    return areAllB412PreInspectionChecksComplete(record);
  }
  if (!isAS350AircraftType(record.aircraftType)) return false;
  return LEGACY_PRE_INSPECTION_CHECK_FIELDS.every(
    (field) => record[field] === true,
  );
};

const getReleaseValidationMessage = (record = {}) => {
  if (
    !isB412AircraftType(record.aircraftType) &&
    !isAS350AircraftType(record.aircraftType)
  ) {
    return "No pre-flight inspection checklist is configured for this aircraft type.";
  }
  if (!areAllReleaseChecksComplete(record)) {
    return isB412AircraftType(record.aircraftType)
      ? "Please check all Bell 412 pre-flight inspection items before release"
      : "Please check all pre-flight inspection items before release";
  }
  if (!hasValidFob(record)) {
    return "FOB must be filled in before release.";
  }
  return "";
};

const createPreInspection = async (req, res) => {
  try {
    const flightLog = await getInspectionFlightLog(req.body);
    if (!flightLog) return res.status(400).json({ message: "Select a linked Flight Log before creating this inspection." });
    if (flightLog.status === "completed") return res.status(400).json({ message: "Choose an open Flight Log for a new inspection." });
    if (!isAssignedFlightCrew(req.user, flightLog) || getAssignedCrewField(req.user) !== "assignedMechanic") {
      return res.status(403).json({ message: "Only the linked Flight Log's assigned mechanic can create this inspection." });
    }
    const payload = {
      ...req.body,
      flightLogId: flightLog._id,
      rpc: flightLog.rpc,
      aircraftType: flightLog.aircraftType,
      dateAdded: req.body.dateAdded || new Date().toLocaleDateString("en-US"),
      status: req.body.status || "pending",
    };

    if (isB412AircraftType(payload.aircraftType)) {
      if (payload.b412Data === undefined) {
        payload.b412Data = { checks: {} };
      }

      const b412PayloadError = getB412PreInspectionPayloadShapeError(
        payload.b412Data,
      );
      if (b412PayloadError) {
        return res.status(400).json({ message: b412PayloadError });
      }
    } else {
      delete payload.b412Data;
    }

    if (normalizeStatus(payload.status) === "released") {
      const validationMessage = getReleaseValidationMessage(payload);
      if (validationMessage) {
        return res.status(400).json({ message: validationMessage });
      }
    }

    const inspection = await PreInspection.create(payload);

    const linkedPostPayload = {
      flightLogId: flightLog._id,
      preInspectionId: inspection._id,
      linkedFromPreFlight: true,
      aircraftType: payload.aircraftType,
      rpc: payload.rpc,
      base: payload.base || "",
      date: payload.date,
      dateAdded: payload.dateAdded || new Date().toLocaleDateString("en-US"),
      createdBy: payload.createdBy || "",
      status: "pending",
      ...(isB412AircraftType(payload.aircraftType)
        ? { b412Data: { checks: {} } }
        : {}),
    };

    try {
      await PostInspection.create(linkedPostPayload);
    } catch (postCreateError) {
      await PreInspection.findByIdAndDelete(inspection._id);
      throw postCreateError;
    }

    await createPreInspectionNotifications({
      previousInspection: null,
      inspection: withInspectionCrew(inspection, flightLog),
      actorUserId: req.user?.id,
    });

    const audit = withActorId(req, `Pre-inspection created: ${inspection._id}`);
    await auditLog(audit.action, audit.actorId);

    res.status(201).json({
      message: "Pre-inspection created successfully",
      data: withInspectionCrew(inspection, flightLog),
    });
  } catch (err) {
    console.error("Error creating pre-flight inspection:", err);
    res.status(500).json({ message: "Failed to create pre-flight inspection" });
  }
};

const getAllPreInspections = async (req, res) => {
  try {
    const inspections = await PreInspection.find().sort({ createdAt: -1 }).populate("flightLogId", "assignedPilot assignedMechanic controlNo");
    res.status(200).json({ status: "Ok", data: inspections.map((inspection) => withInspectionCrew(inspection)) });
  } catch (err) {
    console.error("Error fetching pre-flight inspections:", err);
    res.status(500).json({ message: "Failed to fetch pre-flight inspections" });
  }
};

const getPreInspectionById = async (req, res) => {
  try {
    const inspection = await PreInspection.findById(req.params.id).populate("flightLogId", "assignedPilot assignedMechanic controlNo");

    if (!inspection) {
      return res.status(404).json({ message: "Pre-inspection not found" });
    }

    res.status(200).json({ status: "Ok", data: withInspectionCrew(inspection) });
  } catch (err) {
    console.error("Error fetching pre-flight inspection:", err);
    res.status(500).json({ message: "Failed to fetch pre-flight inspection" });
  }
};

const updatePreInspection = async (req, res) => {
  try {
    const previousInspection = await PreInspection.findById(req.params.id);

    if (!previousInspection) {
      return res.status(404).json({ message: "Pre-inspection not found" });
    }

    const flightLog = await getInspectionFlightLog(previousInspection);
    if (!isAssignedFlightCrew(req.user, flightLog)) {
      return res.status(403).json({ message: CREW_ACCESS_MESSAGE });
    }
    const updates = pickInspectionUpdates(req.body, PreInspection);
    const previousPayload = previousInspection.toObject();
    const nextPayload = {
      ...previousPayload,
      ...updates,
    };
    const previousStatus = normalizeStatus(previousPayload.status);
    const nextStatus = normalizeStatus(nextPayload.status);

    if (previousStatus === "completed") {
      return res
        .status(400)
        .json({ message: "Completed pre-flight inspections are view-only." });
    }

    const nextIsB412 = isB412AircraftType(nextPayload.aircraftType);

    if (nextIsB412) {
      if (nextPayload.b412Data === undefined || nextPayload.b412Data === null) {
        nextPayload.b412Data = { checks: {} };
        updates.b412Data = nextPayload.b412Data;
      }

      const b412PayloadError = getB412PreInspectionPayloadShapeError(
        nextPayload.b412Data,
      );
      if (b412PayloadError) {
        return res.status(400).json({ message: b412PayloadError });
      }
    } else if (
      isB412AircraftType(previousPayload.aircraftType) ||
      Object.prototype.hasOwnProperty.call(req.body, "b412Data")
    ) {
      updates.b412Data = null;
      nextPayload.b412Data = null;
    }

    if (nextStatus === "released") {
      if (getAssignedCrewField(req.user) !== "assignedMechanic") return res.status(403).json({ message: "Only the assigned mechanic can release this inspection." });
      const validationMessage = getReleaseValidationMessage(nextPayload);
      if (validationMessage) {
        return res.status(400).json({ message: validationMessage });
      }
    }

    if (nextStatus === "completed") {
      if (getAssignedCrewField(req.user) !== "assignedPilot") {
        return res.status(403).json({ message: "Only the assigned pilot can accept this pre-flight inspection." });
      }
      if (previousStatus !== "released") {
        return res.status(400).json({
          message: "Only released pre-flight inspections can be accepted.",
        });
      }
      const validationMessage = getReleaseValidationMessage(nextPayload);
      if (validationMessage) {
        return res.status(400).json({
          message:
            validationMessage === "FOB must be filled in before release."
              ? "FOB must be filled in before acceptance."
              : validationMessage,
        });
      }
    }

    const inspection = await PreInspection.findByIdAndUpdate(
      req.params.id,
      updates,
      { returnDocument: "after", runValidators: true },
    );

    await createPreInspectionNotifications({
      previousInspection,
      inspection: withInspectionCrew(inspection, flightLog),
      actorUserId: req.user?.id,
    });

    const audit = withActorId(req, `Pre-inspection updated: ${inspection._id}`);
    await auditLog(audit.action, audit.actorId);

    res.status(200).json({
      message: "Pre-inspection updated successfully",
      data: withInspectionCrew(inspection, flightLog),
    });
  } catch (err) {
    console.error("Error updating pre-flight inspection:", err);
    res.status(500).json({ message: "Failed to update pre-flight inspection" });
  }
};

const deletePreInspection = async (req, res) => {
  try {
    const inspection = await PreInspection.findById(req.params.id);

    if (!inspection) {
      return res.status(404).json({ message: "Pre-inspection not found" });
    }
    const flightLog = await getInspectionFlightLog(inspection);
    if (!isAssignedFlightCrew(req.user, flightLog)) return res.status(403).json({ message: CREW_ACCESS_MESSAGE });
    if (normalizeStatus(inspection.status) === "completed") return res.status(400).json({ message: "Completed inspections are view-only." });
    await PreInspection.findByIdAndDelete(req.params.id);
    const audit = withActorId(req, `Pre-inspection deleted: ${inspection._id}`);
    await auditLog(audit.action, audit.actorId);

    res.status(200).json({
      message: "Pre-inspection deleted successfully",
      data: inspection,
    });
  } catch (err) {
    console.error("Error deleting pre-flight inspection:", err);
    res.status(500).json({ message: "Failed to delete pre-flight inspection" });
  }
};

module.exports = {
  createPreInspection,
  getAllPreInspections,
  getPreInspectionById,
  updatePreInspection,
  deletePreInspection,
};
