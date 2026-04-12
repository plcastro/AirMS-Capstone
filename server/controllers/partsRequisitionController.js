const partsRequisitionModel = require("../models/partsRequisitionModel");
const { auditLog } = require("./logsController");
const {
  createPartsRequisitionNotifications,
} = require("../utilities/partsRequisitionNotificationService");
const getAuditActorId = (req, fallbackId = null) => req.user?.id || fallbackId;
const withActorId = (req, action, fallbackId = null) => {
  const actorId = getAuditActorId(req, fallbackId);
  return {
    actorId,
    action: actorId ? `${action} (actorId: ${actorId})` : action,
  };
};

const getAllRequisitions = async (req, res) => {
  try {
    const requisitions = await partsRequisitionModel
      .find()
      .sort({ createdAt: -1 });
    res.status(200).json(requisitions);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const getRequisitionById = async (req, res) => {
  const requisitionId = req.params.id;
  try {
    const requisition = await partsRequisitionModel.findById(requisitionId);
    if (!requisition) {
      return res.status(404).json({ message: "Requisition not found" });
    }
    res.status(200).json(requisition);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const createRequisition = async (req, res) => {
  try {
    const {
      wrsNo,
      aircraft,
      staff,
      items,
      dateRequested,
      dateApproved,
      dateReceived,
      status,
    } = req.body;

    const newRequisition = new partsRequisitionModel({
      wrsNo,
      aircraft,
      staff: {
        ...staff,
        requisitionerId: req.user?.id || staff?.requisitionerId,
      },
      items,
      dateRequested,
      dateApproved,
      dateReceived,
      status: status || "Parts Requested",
    });
    const savedRequisition = await newRequisition.save();
    const audit = withActorId(
      req,
      `Parts requisition created: ${savedRequisition.wrsNo}`,
      savedRequisition._id,
    );
    await auditLog(audit.action, audit.actorId);
    await createPartsRequisitionNotifications({
      previousRequisition: null,
      requisition: savedRequisition,
    });
    res.status(201).json(savedRequisition);
  } catch (error) {
    res.status(400).json({ message: "Invalid data", error: error.message });
  }
};

const updateRequisitionStatus = async (req, res) => {
  try {
    const existingRequisition = await partsRequisitionModel.findById(req.params.id);

    if (!existingRequisition) {
      return res.status(404).json({ message: "Requisition not found" });
    }

    const updatePayload = {};

    [
      "status",
      "aircraft",
      "items",
      "dateRequested",
      "dateReceived",
      "dateApproved",
      "dateWarehouseReviewed",
      "dateOrdered",
      "dateDelivered",
      "dateCancelled",
    ].forEach((field) => {
      if (req.body[field] !== undefined) {
        updatePayload[field] = req.body[field];
      }
    });

    const staffMappings = {
      requisitioner: "staff.requisitioner",
      requisitionerId: "staff.requisitionerId",
      approvedBy: "staff.approvedBy",
      receiver: "staff.receiver",
      notedBy: "staff.notedBy",
      warehouseBy: "staff.warehouseBy",
      deliveredBy: "staff.deliveredBy",
    };

    Object.entries(staffMappings).forEach(([requestField, modelField]) => {
      if (req.body[requestField] !== undefined) {
        updatePayload[modelField] = req.body[requestField];
      }
    });

    const updatedRequisition = await partsRequisitionModel.findByIdAndUpdate(req.params.id, updatePayload, {
      new: true,
      runValidators: true,
    });
    const audit = withActorId(
      req,
      `Parts requisition updated: ${updatedRequisition.wrsNo}, status set to ${updatedRequisition.status}`,
      updatedRequisition._id,
    );
    await auditLog(audit.action, audit.actorId);
    await createPartsRequisitionNotifications({
      previousRequisition: existingRequisition,
      requisition: updatedRequisition,
    });
    res.status(200).json(updatedRequisition);
  } catch (error) {
    res.status(400).json({ message: "Update failed", error: error.message });
  }
};

module.exports = {
  getAllRequisitions,
  getRequisitionById,
  createRequisition,
  updateRequisitionStatus,
};
