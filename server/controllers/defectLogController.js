const DefectLog = require("../models/defectLogModel");
const { auditLog } = require("./logsController"); // optional for logging

// --- CREATE ---
const createDefectLog = async (req, res) => {
  try {
    const { reportedBy, aircraft_model, description } = req.body;

    if (!reportedBy || !aircraft_model) {
      return res.status(400).json({
        message: "reportedBy and aircraft_model are required fields.",
      });
    }

    const newLog = await DefectLog.create({
      reportedBy,
      aircraft_model,
      description,
    });

    await auditLog(
      `Defect log created by ${reportedBy} for ${aircraft_model}`,
      null,
    );

    res.status(201).json({ message: "Defect log created", data: newLog });
  } catch (err) {
    console.error("Error creating defect log:", err);
    res.status(500).json({ message: "Failed to create defect log" });
  }
};

// --- READ ALL ---
const getAllDefectLogs = async (req, res) => {
  try {
    const logs = await DefectLog.find().sort({ date: -1 });
    res.status(200).json({ status: "Ok", data: logs });
  } catch (err) {
    console.error("Error fetching defect logs:", err);
    res.status(500).json({ message: "Failed to fetch defect logs" });
  }
};

// --- READ ONE ---
const getDefectLogById = async (req, res) => {
  try {
    const log = await DefectLog.findById(req.params.id);
    if (!log) return res.status(404).json({ message: "Defect log not found" });

    res.status(200).json({ status: "Ok", data: log });
  } catch (err) {
    console.error("Error fetching defect log:", err);
    res.status(500).json({ message: "Failed to fetch defect log" });
  }
};

// --- UPDATE ---
const updateDefectLog = async (req, res) => {
  try {
    const { reportedBy, aircraft_model, description } = req.body;

    const updatedLog = await DefectLog.findByIdAndUpdate(
      req.params.id,
      { reportedBy, aircraft_model, description },
      { returnDocument: "after", runValidators: true },
    );

    if (!updatedLog)
      return res.status(404).json({ message: "Defect log not found" });

    await auditLog(`Defect log updated: ${req.params.id}`, null);

    res
      .status(200)
      .json({ message: "Defect log updated successfully", data: updatedLog });
  } catch (err) {
    console.error("Error updating defect log:", err);
    res.status(500).json({ message: "Failed to update defect log" });
  }
};

// --- DELETE ---
const deleteDefectLog = async (req, res) => {
  try {
    const deletedLog = await DefectLog.findByIdAndDelete(req.params.id);
    if (!deletedLog)
      return res.status(404).json({ message: "Defect log not found" });

    await auditLog(`Defect log deleted: ${req.params.id}`, null);

    res
      .status(200)
      .json({ message: "Defect log deleted successfully", data: deletedLog });
  } catch (err) {
    console.error("Error deleting defect log:", err);
    res.status(500).json({ message: "Failed to delete defect log" });
  }
};

module.exports = {
  createDefectLog,
  getAllDefectLogs,
  getDefectLogById,
  updateDefectLog,
  deleteDefectLog,
};
