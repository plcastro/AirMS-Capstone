const PreInspection = require("../models/preInspectionModel");
const PostInspection = require("../models/postInspectionModel");
const {
  createPreInspectionNotifications,
} = require("../utils/preInspectionNotificationService");
const { auditLog } = require("./logsController");
const getAuditActorId = (req, fallbackId = null) => req.user?.id || fallbackId;
const withActorId = (req, action, fallbackId = null) => {
  const actorId = getAuditActorId(req, fallbackId);
  return {
    actorId,
    action: actorId ? `${action} (actorId: ${actorId})` : action,
  };
};

const PRE_INSPECTION_CHECK_FIELDS = Object.entries(
  PreInspection.schema.paths,
)
  .filter(([, schemaType]) => schemaType.instance === "Boolean")
  .map(([field]) => field);

const normalizeStatus = (value) => String(value || "").trim().toLowerCase();

const hasValidFob = (record = {}) => {
  const value = String(record.fob ?? "").trim();
  if (!value) return false;

  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0;
};

const areAllReleaseChecksComplete = (record = {}) =>
  PRE_INSPECTION_CHECK_FIELDS.every((field) => record[field] === true);

const getReleaseValidationMessage = (record = {}) => {
  if (!areAllReleaseChecksComplete(record)) {
    return "Please check all pre-flight inspection items before release";
  }
  if (!hasValidFob(record)) {
    return "FOB must be filled in before release.";
  }
  return "";
};

const createPreInspection = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      dateAdded: req.body.dateAdded || new Date().toLocaleDateString("en-US"),
      status: req.body.status || "pending",
    };

    if (normalizeStatus(payload.status) === "released") {
      const validationMessage = getReleaseValidationMessage(payload);
      if (validationMessage) {
        return res.status(400).json({ message: validationMessage });
      }
    }

    const inspection = await PreInspection.create(payload);

    const linkedPostPayload = {
      preInspectionId: inspection._id,
      linkedFromPreFlight: true,
      aircraftType: payload.aircraftType,
      rpc: payload.rpc,
      base: payload.base || "",
      date: payload.date,
      dateAdded: payload.dateAdded || new Date().toLocaleDateString("en-US"),
      createdBy: payload.createdBy || "",
      status: "pending",
    };

    try {
      await PostInspection.create(linkedPostPayload);
    } catch (postCreateError) {
      await PreInspection.findByIdAndDelete(inspection._id);
      throw postCreateError;
    }

    await createPreInspectionNotifications({
      previousInspection: null,
      inspection,
      actorUserId: req.user?.id,
    });

    const audit = withActorId(req, `Pre-inspection created: ${inspection._id}`);
    await auditLog(audit.action, audit.actorId);

    res.status(201).json({
      message: "Pre-inspection created successfully",
      data: inspection,
    });
  } catch (err) {
    console.error("Error creating pre-flight inspection:", err);
    res.status(500).json({ message: "Failed to create pre-flight inspection" });
  }
};

const getAllPreInspections = async (req, res) => {
  try {
    const inspections = await PreInspection.find().sort({ createdAt: -1 });
    res.status(200).json({ status: "Ok", data: inspections });
  } catch (err) {
    console.error("Error fetching pre-flight inspections:", err);
    res.status(500).json({ message: "Failed to fetch pre-flight inspections" });
  }
};

const getPreInspectionById = async (req, res) => {
  try {
    const inspection = await PreInspection.findById(req.params.id);

    if (!inspection) {
      return res.status(404).json({ message: "Pre-inspection not found" });
    }

    res.status(200).json({ status: "Ok", data: inspection });
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

    const previousPayload = previousInspection.toObject();
    const nextPayload = {
      ...previousPayload,
      ...req.body,
    };
    const previousStatus = normalizeStatus(previousPayload.status);
    const nextStatus = normalizeStatus(nextPayload.status);

    if (previousStatus === "completed") {
      return res
        .status(400)
        .json({ message: "Completed pre-flight inspections are view-only." });
    }

    if (nextStatus === "released") {
      const validationMessage = getReleaseValidationMessage(nextPayload);
      if (validationMessage) {
        return res.status(400).json({ message: validationMessage });
      }
    }

    if (nextStatus === "completed") {
      if (previousStatus !== "released") {
        return res.status(400).json({
          message: "Only released pre-flight inspections can be accepted.",
        });
      }
      if (!hasValidFob(nextPayload)) {
        return res
          .status(400)
          .json({ message: "FOB must be filled in before acceptance." });
      }
    }

    const inspection = await PreInspection.findByIdAndUpdate(
      req.params.id,
      req.body,
      { returnDocument: "after", runValidators: true },
    );

    await createPreInspectionNotifications({
      previousInspection,
      inspection,
      actorUserId: req.user?.id,
    });

    const audit = withActorId(req, `Pre-inspection updated: ${inspection._id}`);
    await auditLog(audit.action, audit.actorId);

    res.status(200).json({
      message: "Pre-inspection updated successfully",
      data: inspection,
    });
  } catch (err) {
    console.error("Error updating pre-flight inspection:", err);
    res.status(500).json({ message: "Failed to update pre-flight inspection" });
  }
};

const deletePreInspection = async (req, res) => {
  try {
    const inspection = await PreInspection.findByIdAndDelete(req.params.id);

    if (!inspection) {
      return res.status(404).json({ message: "Pre-inspection not found" });
    }
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
