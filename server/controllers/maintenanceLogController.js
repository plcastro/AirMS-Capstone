const MaintenanceLog = require("../models/maintenanceLogModel");
const { auditLog } = require("./logsController"); // optional for logging

// --- CREATE ---
const createMaintenanceLog = async (req, res) => {
  try {
    const {
      aircraft,
      defects,
      dateDefectDiscovered,
      correctiveActionDone,
      dateDefectRectified,
      reportedBy,
      status,
    } = req.body;

    if (!aircraft || !reportedBy) {
      return res.status(400).json({
        message: "Aircraft and reportedBy are required fields.",
      });
    }

    const newLog = await MaintenanceLog.create({
      aircraft,
      defects,
      dateDefectDiscovered,
      correctiveActionDone,
      dateDefectRectified,
      reportedBy,
      status,
    });

    await auditLog(
      `Maintenance log created for aircraft: ${aircraft} by ${reportedBy}`,
      null,
    );

    res.status(201).json({ message: "Maintenance log created", data: newLog });
  } catch (err) {
    console.error("Error creating maintenance log:", err);
    res.status(500).json({ message: "Failed to create maintenance log" });
  }
};

// --- READ ALL ---
const getAllMaintenanceLogs = async (req, res) => {
  try {
    const logs = await MaintenanceLog.find().sort({ dateDefectDiscovered: -1 });
    res.status(200).json({ status: "Ok", data: logs });
  } catch (err) {
    console.error("Error fetching maintenance logs:", err);
    res.status(500).json({ message: "Failed to fetch maintenance logs" });
  }
};

// --- READ ONE ---
const getMaintenanceLogById = async (req, res) => {
  try {
    const log = await MaintenanceLog.findById(req.params.id);
    if (!log)
      return res.status(404).json({ message: "Maintenance log not found" });

    res.status(200).json({ status: "Ok", data: log });
  } catch (err) {
    console.error("Error fetching maintenance log:", err);
    res.status(500).json({ message: "Failed to fetch maintenance log" });
  }
};

// --- UPDATE ---
const updateMaintenanceLog = async (req, res) => {
  try {
    const {
      aircraft,
      defects,
      dateDefectDiscovered,
      correctiveActionDone,
      dateDefectRectified,
      reportedBy,
      status,
    } = req.body;

    const updatedLog = await MaintenanceLog.findByIdAndUpdate(
      req.params.id,
      {
        aircraft,
        defects,
        dateDefectDiscovered,
        correctiveActionDone,
        dateDefectRectified,
        reportedBy,
        status,
      },
      { returnDocument: "after", runValidators: true },
    );

    if (!updatedLog)
      return res.status(404).json({ message: "Maintenance log not found" });

    await auditLog(
      `Maintenance log updated: ${req.params.id} for aircraft ${aircraft}`,
      null,
    );

    res
      .status(200)
      .json({
        message: "Maintenance log updated successfully",
        data: updatedLog,
      });
  } catch (err) {
    console.error("Error updating maintenance log:", err);
    res.status(500).json({ message: "Failed to update maintenance log" });
  }
};

// --- DELETE ---
const deleteMaintenanceLog = async (req, res) => {
  try {
    const deletedLog = await MaintenanceLog.findByIdAndDelete(req.params.id);
    if (!deletedLog)
      return res.status(404).json({ message: "Maintenance log not found" });

    await auditLog(
      `Maintenance log deleted: ${req.params.id} for aircraft ${deletedLog.aircraft}`,
      null,
    );

    res
      .status(200)
      .json({
        message: "Maintenance log deleted successfully",
        data: deletedLog,
      });
  } catch (err) {
    console.error("Error deleting maintenance log:", err);
    res.status(500).json({ message: "Failed to delete maintenance log" });
  }
};

module.exports = {
  createMaintenanceLog,
  getAllMaintenanceLogs,
  getMaintenanceLogById,
  updateMaintenanceLog,
  deleteMaintenanceLog,
};
