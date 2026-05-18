const TechnicalLog = require("../models/technicalLogModel");
const { auditLog } = require("./logsController");

// --- CREATE Technical Log ---
const createTechnicalLog = async (req, res) => {
  try {
    const data = req.body;
    if (!data.createdBy) {
      return res.status(400).json({ message: "createdBy is required" });
    }

    const log = await TechnicalLog.create(data);

    await auditLog(
      `Technical log created for tailNum: ${data.tailNum}`,
      req.user?.id || data.createdBy || null,
    );

    res.status(201).json({ message: "Technical log created", data: log });
  } catch (err) {
    console.error("Error creating technical log:", err);
    res.status(500).json({ message: "Failed to create technical log" });
  }
};

// --- GET ALL Technical Logs ---
const getAllTechnicalLogs = async (req, res) => {
  try {
    const logs = await TechnicalLog.find().sort({ date: -1 });
    res.status(200).json({ status: "Ok", data: logs });
  } catch (err) {
    console.error("Error fetching technical logs:", err);
    res.status(500).json({ message: "Failed to fetch technical logs" });
  }
};

// --- GET ONE Technical Log ---
const getTechnicalLogById = async (req, res) => {
  try {
    const log = await TechnicalLog.findById(req.params.id);
    if (!log)
      return res.status(404).json({ message: "Technical log not found" });

    res.status(200).json({ status: "Ok", data: log });
  } catch (err) {
    console.error("Error fetching technical log:", err);
    res.status(500).json({ message: "Failed to fetch technical log" });
  }
};

// --- UPDATE Technical Log ---
const updateTechnicalLog = async (req, res) => {
  try {
    const updatedLog = await TechnicalLog.findByIdAndUpdate(
      req.params.id,
      req.body,
      { returnDocument: "after", runValidators: true },
    );

    if (!updatedLog)
      return res.status(404).json({ message: "Technical log not found" });

    await auditLog(
      `Technical log updated: ${updatedLog.tailNum}`,
      req.user?.id || req.body.createdBy || null,
    );

    res
      .status(200)
      .json({ message: "Technical log updated", data: updatedLog });
  } catch (err) {
    console.error("Error updating technical log:", err);
    res.status(500).json({ message: "Failed to update technical log" });
  }
};

// --- DELETE Technical Log ---
const deleteTechnicalLog = async (req, res) => {
  try {
    const deletedLog = await TechnicalLog.findByIdAndDelete(req.params.id);
    if (!deletedLog)
      return res.status(404).json({ message: "Technical log not found" });

    await auditLog(
      `Technical log deleted: ${deletedLog.tailNum}`,
      req.user?.id || deletedLog.createdBy || null,
    );

    res
      .status(200)
      .json({ message: "Technical log deleted", data: deletedLog });
  } catch (err) {
    console.error("Error deleting technical log:", err);
    res.status(500).json({ message: "Failed to delete technical log" });
  }
};

module.exports = {
  createTechnicalLog,
  getAllTechnicalLogs,
  getTechnicalLogById,
  updateTechnicalLog,
  deleteTechnicalLog,
};
