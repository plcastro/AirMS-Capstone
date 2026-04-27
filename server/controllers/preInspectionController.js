const PreInspection = require("../models/preInspectionModel");
const PostInspection = require("../models/postInspectionModel");
const { createPreInspectionNotifications } = require("../utils/preInspectionNotificationService");
const { auditLog } = require("./logsController");
const getAuditActorId = (req, fallbackId = null) => req.user?.id || fallbackId;
const withActorId = (req, action, fallbackId = null) => {
  const actorId = getAuditActorId(req, fallbackId);
  return {
    actorId,
    action: actorId ? `${action} (actorId: ${actorId})` : action,
  };
};

const createPreInspection = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      dateAdded:
        req.body.dateAdded || new Date().toLocaleDateString("en-US"),
      status: req.body.status || "pending",
    };

    const inspection = await PreInspection.create(payload);

    const linkedPostPayload = {
      preInspectionId: inspection._id,
      linkedFromPreFlight: true,
      aircraftType: payload.aircraftType,
      rpc: payload.rpc,
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
    });

    const audit = withActorId(req, `Pre-inspection created: ${inspection._id}`);
    await auditLog(audit.action, audit.actorId);

    res.status(201).json({
      message: "Pre-inspection created successfully",
      data: inspection,
    });
  } catch (err) {
    console.error("Error creating pre-inspection:", err);
    res.status(500).json({ message: "Failed to create pre-inspection" });
  }
};

const getAllPreInspections = async (req, res) => {
  try {
    const inspections = await PreInspection.find().sort({ createdAt: -1 });
    res.status(200).json({ status: "Ok", data: inspections });
  } catch (err) {
    console.error("Error fetching pre-inspections:", err);
    res.status(500).json({ message: "Failed to fetch pre-inspections" });
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
    console.error("Error fetching pre-inspection:", err);
    res.status(500).json({ message: "Failed to fetch pre-inspection" });
  }
};

const updatePreInspection = async (req, res) => {
  try {
    const previousInspection = await PreInspection.findById(req.params.id);

    const inspection = await PreInspection.findByIdAndUpdate(
      req.params.id,
      req.body,
      { returnDocument: "after", runValidators: true },
    );

    if (!inspection) {
      return res.status(404).json({ message: "Pre-inspection not found" });
    }

    await createPreInspectionNotifications({
      previousInspection,
      inspection,
    });

    const audit = withActorId(req, `Pre-inspection updated: ${inspection._id}`);
    await auditLog(audit.action, audit.actorId);

    res.status(200).json({
      message: "Pre-inspection updated successfully",
      data: inspection,
    });
  } catch (err) {
    console.error("Error updating pre-inspection:", err);
    res.status(500).json({ message: "Failed to update pre-inspection" });
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
    console.error("Error deleting pre-inspection:", err);
    res.status(500).json({ message: "Failed to delete pre-inspection" });
  }
};

module.exports = {
  createPreInspection,
  getAllPreInspections,
  getPreInspectionById,
  updatePreInspection,
  deletePreInspection,
};
