const PostInspection = require("../models/postInspectionModel");
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
    const payload = {
      ...req.body,
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
      // Linked pre-flight records are created pending without Bell data. The
      // checklist is initialized when the post-flight record is first edited.
      if (hasOwn(req.body, "b412Data")) {
        const b412PayloadError = getB412PostInspectionPayloadShapeError(
          payload.b412Data,
        );
        if (b412PayloadError) {
          return res.status(400).json({ message: b412PayloadError });
        }
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
    });

    const audit = withActorId(
      req,
      `Post-inspection created: ${inspection._id}`,
    );
    await auditLog(audit.action, audit.actorId);

    res.status(201).json({
      message: "Post-inspection created successfully",
      data: inspection,
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
    const inspections = await PostInspection.find().sort({ createdAt: -1 });
    res.status(200).json({ status: "Ok", data: inspections });
  } catch (err) {
    console.error("Error fetching post-flight inspections:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch post-flight inspections" });
  }
};

const getPostInspectionById = async (req, res) => {
  try {
    const inspection = await PostInspection.findById(req.params.id);

    if (!inspection) {
      return res.status(404).json({ message: "Post-inspection not found" });
    }

    res.status(200).json({ status: "Ok", data: inspection });
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

    const previousPayload = previousInspection.toObject();
    const previousStatus = normalizeStatus(previousPayload.status);

    if (previousStatus === "completed") {
      return res
        .status(400)
        .json({ message: "Completed post-flight inspections are view-only." });
    }

    const nextPayload = {
      ...previousPayload,
      ...req.body,
    };
    const nextStatus = normalizeStatus(nextPayload.status);
    const updates = { ...req.body };
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
    });

    const audit = withActorId(
      req,
      `Post-inspection updated: ${inspection._id}`,
    );
    await auditLog(audit.action, audit.actorId);

    res.status(200).json({
      message: "Post-inspection updated successfully",
      data: inspection,
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
    const inspection = await PostInspection.findByIdAndDelete(req.params.id);

    if (!inspection) {
      return res.status(404).json({ message: "Post-inspection not found" });
    }
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
