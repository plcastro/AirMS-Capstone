const ApproveTechnicalLog = require("../models/approveTechnicalLogModel");
const { auditLog } = require("./logsController");

// --- CREATE Approval ---
const createApproval = async (req, res) => {
  try {
    const data = req.body;
    if (!data.station || !data.signature || !data.ap) {
      return res
        .status(400)
        .json({ message: "station, signature and ap are required" });
    }

    const approval = await ApproveTechnicalLog.create(data);

    await auditLog(
      `Approval created for station: ${data.station}`,
      data.approvedBy || null,
    );

    res.status(201).json({ message: "Approval created", data: approval });
  } catch (err) {
    console.error("Error creating approval:", err);
    res.status(500).json({ message: "Failed to create approval" });
  }
};

// --- GET ALL Approvals ---
const getAllApprovals = async (req, res) => {
  try {
    const approvals = await ApproveTechnicalLog.find().sort({ date: -1 });
    res.status(200).json({ status: "Ok", data: approvals });
  } catch (err) {
    console.error("Error fetching approvals:", err);
    res.status(500).json({ message: "Failed to fetch approvals" });
  }
};

// --- GET ONE Approval ---
const getApprovalById = async (req, res) => {
  try {
    const approval = await ApproveTechnicalLog.findById(req.params.id);
    if (!approval)
      return res.status(404).json({ message: "Approval not found" });

    res.status(200).json({ status: "Ok", data: approval });
  } catch (err) {
    console.error("Error fetching approval:", err);
    res.status(500).json({ message: "Failed to fetch approval" });
  }
};

// --- UPDATE Approval ---
const updateApproval = async (req, res) => {
  try {
    const updated = await ApproveTechnicalLog.findByIdAndUpdate(
      req.params.id,
      req.body,
      { returnDocument: "after", runValidators: true },
    );
    if (!updated)
      return res.status(404).json({ message: "Approval not found" });

    await auditLog(
      `Approval updated: ${updated.station}`,
      req.body.approvedBy || null,
    );

    res.status(200).json({ message: "Approval updated", data: updated });
  } catch (err) {
    console.error("Error updating approval:", err);
    res.status(500).json({ message: "Failed to update approval" });
  }
};

// --- DELETE Approval ---
const deleteApproval = async (req, res) => {
  try {
    const deleted = await ApproveTechnicalLog.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: "Approval not found" });

    await auditLog(
      `Approval deleted: ${deleted.station}`,
      deleted.approvedBy || null,
    );

    res.status(200).json({ message: "Approval deleted", data: deleted });
  } catch (err) {
    console.error("Error deleting approval:", err);
    res.status(500).json({ message: "Failed to delete approval" });
  }
};

module.exports = {
  createApproval,
  getAllApprovals,
  getApprovalById,
  updateApproval,
  deleteApproval,
};
