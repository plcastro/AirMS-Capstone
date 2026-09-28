const PostInspection = require("../models/postInspectionModel");
const { isAssignedFlightCrew, getAssignedCrewField, CREW_ACCESS_MESSAGE } = require("../../shared/flightCrewAccess");
const { getInspectionFlightLog, withInspectionCrew, pickInspectionUpdates } = require("../utils/inspectionFlightCrew");
const {
  createPostInspectionNotifications,
} = require("../utils/postInspectionNotificationService");
const { auditLog } = require("./logsController");
const {
  areAllB412PostInspectionChecksComplete,
  getB412PostInspectionPayloadShapeError,
  isAS350AircraftType,
  isB412AircraftType,
} = require("../utils/b412PostInspection");
const getAuditActorId = (req, fallbackId = null) => req.user?.id || fallbackId;
const withActorId = (req, action, fallbackId = null) => {
  const actorId = getAuditActorId(req, fallbackId);
  return {
    actorId,
    action: actorId ? `${action} (actorId: ${actorId})` : action,
  };
};

const LEGACY_POST_INSPECTION_CHECK_FIELDS = Object.entries(
  PostInspection.schema.paths,
)
  .filter(
    ([field, schemaType]) =>
      schemaType.instance === "Boolean" &&
      field !== "linkedFromPreFlight" &&
      !field.startsWith("b412Data."),
  )
  .map(([field]) => field);

const normalizeStatus = (value) => String(value || "").trim().toLowerCase();

const isSupportedAircraftType = (aircraftType) =>
  isB412AircraftType(aircraftType) || isAS350AircraftType(aircraftType);

const areAllCompletionChecksComplete = (record = {}) => {
  if (isB412AircraftType(record.aircraftType)) {
    return areAllB412PostInspectionChecksComplete(record);
  }
  if (!isAS350AircraftType(record.aircraftType)) return false;

  return LEGACY_POST_INSPECTION_CHECK_FIELDS.every(
    (field) => record[field] === true,
  );
};

const getCompletionValidationMessage = (record = {}) => {
  if (!isSupportedAircraftType(record.aircraftType)) {
    return "No post-flight inspection checklist is configured for this aircraft type.";
  }
  if (!areAllCompletionChecksComplete(record)) {
    return isB412AircraftType(record.aircraftType)
      ? "Please check all Bell 412 post-flight inspection items before completion."
      : "Please check all post-flight inspection items before completion.";
  }
  return "";
};

const hasOwn = (object, key) =>
  Object.prototype.hasOwnProperty.call(object || {}, key);

const stripImmutableUpdateFields = (updates) => {
  for (const field of ["_id", "__v", "createdAt", "updatedAt"]) {
    delete updates[field];
  }
};

const createPostInspection = async (req, res) => {
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
      status: normalizeStatus(req.body.status) || "pending",
    };

    if (!isSupportedAircraftType(payload.aircraftType)) {
      return res.status(400).json({
        message:
          "No post-flight inspection checklist is configured for this aircraft type.",
      });
    }

    if (isB412AircraftType(payload.aircraftType)) {
      if (hasOwn(req.body, "b412Data")) {
        const b412PayloadError = getB412PostInspectionPayloadShapeError(
          payload.b412Data,
        );
        if (b412PayloadError) {
          return res.status(400).json({ message: b412PayloadError });
        }
      } else {
        payload.b412Data = { checks: {} };
      }
    } else {
      delete payload.b412Data;
    }

    if (payload.status === "completed") {
      const validationMessage = getCompletionValidationMessage(payload);
      if (validationMessage) {
        return res.status(400).json({ message: validationMessage });
      }
    }

    const inspection = await PostInspection.create(payload);

    await createPostInspectionNotifications({
      previousInspection: null,
      inspection,
      actorUserId: req.user?.id,
    });

    const audit = withActorId(
      req,
      `Post-inspection created: ${inspection._id}`,
    );
    await auditLog(audit.action, audit.actorId);

    res.status(201).json({
      message: "Post-inspection created successfully",
      data: withInspectionCrew(inspection, flightLog),
    });
  } catch (err) {
    console.error("Error creating post-flight inspection:", err);
    res
      .status(500)
      .json({ message: "Failed to create post-flight inspection" });
  }
};

const getAllPostInspections = async (req, res) => {
  try {
    const inspections = await PostInspection.find().sort({ createdAt: -1 }).populate("flightLogId", "assignedPilot assignedMechanic controlNo");
    res.status(200).json({ status: "Ok", data: inspections.map((inspection) => withInspectionCrew(inspection)) });
  } catch (err) {
    console.error("Error fetching post-flight inspections:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch post-flight inspections" });
  }
};

const getPostInspectionById = async (req, res) => {
  try {
    const inspection = await PostInspection.findById(req.params.id).populate("flightLogId", "assignedPilot assignedMechanic controlNo");

    if (!inspection) {
      return res.status(404).json({ message: "Post-inspection not found" });
    }

    res.status(200).json({ status: "Ok", data: withInspectionCrew(inspection) });
  } catch (err) {
    console.error("Error fetching post-flight inspection:", err);
    res.status(500).json({ message: "Failed to fetch post-flight inspection" });
  }
};

const updatePostInspection = async (req, res) => {
  try {
    const previousInspection = await PostInspection.findById(req.params.id);

    if (!previousInspection) {
      return res.status(404).json({ message: "Post-inspection not found" });
    }

    const flightLog = await getInspectionFlightLog(previousInspection);
    if (!isAssignedFlightCrew(req.user, flightLog)) return res.status(403).json({ message: CREW_ACCESS_MESSAGE });
    const previousPayload = previousInspection.toObject();
    const previousStatus = normalizeStatus(previousPayload.status);

    if (previousStatus === "completed") {
      return res
        .status(400)
        .json({ message: "Completed post-flight inspections are view-only." });
    }

    const updates = pickInspectionUpdates(req.body, PostInspection);
    const nextPayload = {
      ...previousPayload,
      ...updates,
    };
    const nextStatus = normalizeStatus(nextPayload.status);
    stripImmutableUpdateFields(updates);

    if (hasOwn(req.body, "status")) {
      updates.status = nextStatus;
      nextPayload.status = nextStatus;
    }

    if (!isSupportedAircraftType(nextPayload.aircraftType)) {
      return res.status(400).json({
        message:
          "No post-flight inspection checklist is configured for this aircraft type.",
      });
    }

    const nextIsB412 = isB412AircraftType(nextPayload.aircraftType);

    if (nextIsB412) {
      if (hasOwn(req.body, "b412Data")) {
        const b412PayloadError = getB412PostInspectionPayloadShapeError(
          req.body.b412Data,
        );
        if (b412PayloadError) {
          return res.status(400).json({ message: b412PayloadError });
        }
      } else if (nextPayload.b412Data != null) {
        const b412PayloadError = getB412PostInspectionPayloadShapeError(
          nextPayload.b412Data,
        );
        if (b412PayloadError) {
          return res.status(400).json({ message: b412PayloadError });
        }
      } else {
        nextPayload.b412Data = { checks: {} };
        updates.b412Data = nextPayload.b412Data;
      }
    } else {
      delete nextPayload.b412Data;
      delete updates.b412Data;
    }

    if (nextStatus === "completed") {
      const validationMessage = getCompletionValidationMessage(nextPayload);
      if (validationMessage) {
        return res.status(400).json({ message: validationMessage });
      }
    }

    let updateDocument = updates;
    if (!nextIsB412) {
      updateDocument = { $unset: { b412Data: 1 } };
      if (Object.keys(updates).length) {
        updateDocument.$set = updates;
      }
    }

    const inspection = await PostInspection.findByIdAndUpdate(
      req.params.id,
      updateDocument,
      { returnDocument: "after", runValidators: true },
    );

    if (!inspection) {
      return res.status(404).json({ message: "Post-inspection not found" });
    }

    await createPostInspectionNotifications({
      previousInspection,
      inspection,
      actorUserId: req.user?.id,
    });

    const audit = withActorId(
      req,
      `Post-inspection updated: ${inspection._id}`,
    );
    await auditLog(audit.action, audit.actorId);

    res.status(200).json({
      message: "Post-inspection updated successfully",
      data: withInspectionCrew(inspection, flightLog),
    });
  } catch (err) {
    console.error("Error updating post-flight inspection:", err);
    res
      .status(500)
      .json({ message: "Failed to update post-flight inspection" });
  }
};

const deletePostInspection = async (req, res) => {
  try {
    const inspection = await PostInspection.findById(req.params.id);

    if (!inspection) {
      return res.status(404).json({ message: "Post-inspection not found" });
    }
    const flightLog = await getInspectionFlightLog(inspection);
    if (!isAssignedFlightCrew(req.user, flightLog)) return res.status(403).json({ message: CREW_ACCESS_MESSAGE });
    if (normalizeStatus(inspection.status) === "completed") return res.status(400).json({ message: "Completed inspections are view-only." });
    await PostInspection.findByIdAndDelete(req.params.id);
    const audit = withActorId(
      req,
      `Post-inspection deleted: ${inspection._id}`,
    );
    await auditLog(audit.action, audit.actorId);

    res.status(200).json({
      message: "Post-inspection deleted successfully",
      data: inspection,
    });
  } catch (err) {
    console.error("Error deleting post-flight inspection:", err);
    res
      .status(500)
      .json({ message: "Failed to delete post-flight inspection" });
  }
};

module.exports = {
  createPostInspection,
  getAllPostInspections,
  getPostInspectionById,
  updatePostInspection,
  deletePostInspection,
};
