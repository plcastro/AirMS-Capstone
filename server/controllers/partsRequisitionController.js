const partsRequisitionModel = require("../models/partsRequisitionModel");
const { auditLog } = require("./logsController");
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
      staff,
      items,
      dateRequested,
      dateApproved,
      dateReceived,
      status,
    });
    const savedRequisition = await newRequisition.save();
    const audit = withActorId(
      req,
      `Parts requisition created: ${savedRequisition.wrsNo}`,
      savedRequisition._id,
    );
    await auditLog(audit.action, audit.actorId);
    res.status(201).json(savedRequisition);
  } catch (error) {
    res.status(400).json({ message: "Invalid data", error: error.message });
  }
};

const updateRequisitionStatus = async (req, res) => {
  try {
    const updatePayload = {
      status: req.body.status,
    };

    if (req.body.dateReceived) {
      updatePayload.dateReceived = req.body.dateReceived;
    }

    if (req.body.dateApproved) {
      updatePayload.dateApproved = req.body.dateApproved;
    }

    if (req.body.approvedBy) {
      updatePayload["staff.approvedBy"] = req.body.approvedBy;
    }

    if (req.body.receiver) {
      updatePayload["staff.receiver"] = req.body.receiver;
    }

    const updatedRequisition = await partsRequisitionModel.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true, runValidators: true },
    );

    if (!updatedRequisition) {
      return res.status(404).json({ message: "Requisition not found" });
    }
    const audit = withActorId(
      req,
      `Parts requisition updated: ${updatedRequisition.wrsNo}, status set to ${updatedRequisition.status}`,
      updatedRequisition._id,
    );
    await auditLog(audit.action, audit.actorId);
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
