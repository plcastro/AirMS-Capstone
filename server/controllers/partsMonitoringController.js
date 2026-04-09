// controllers/partsMonitoringController.js
const PartsMonitoring = require("../models/partsMonitoring");
const { auditLog } = require("./logsController");
const getAuditActorId = (req, fallbackId = null) => req.user?.id || fallbackId;
const withActorId = (req, action, fallbackId = null) => {
  const actorId = getAuditActorId(req, fallbackId);
  return {
    actorId,
    action: actorId ? `${action} (actorId: ${actorId})` : action,
  };
};

// Save or update parts monitoring data
const savePartsMonitoring = async (req, res) => {
  try {
    console.log("=== SAVE REQUEST RECEIVED ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    const { aircraft, referenceData, parts, updatedBy } = req.body;

    if (!aircraft) {
      console.log("Error: No aircraft provided");
      return res.status(400).json({
        success: false,
        message: "Aircraft is required",
      });
    }

    if (!parts || !Array.isArray(parts)) {
      console.log("Error: Parts data is invalid or missing");
      return res.status(400).json({
        success: false,
        message: "Parts data is required and must be an array",
      });
    }

    console.log(`Processing save for aircraft: ${aircraft}`);
    console.log(`Number of parts: ${parts.length}`);

    // Check if data already exists for this aircraft
    let existingData = await PartsMonitoring.findOne({ aircraft });
    console.log("Existing data found:", existingData ? "Yes" : "No");

    if (existingData) {
      // Update existing data
      existingData.referenceData = referenceData || existingData.referenceData;
      existingData.parts = parts;
      existingData.lastUpdated = Date.now();
      existingData.updatedBy = updatedBy || "system";

      await existingData.save();
      const audit = withActorId(
        req,
        `Parts monitoring updated for aircraft: ${aircraft}`,
      );
      await auditLog(audit.action, audit.actorId);
      console.log("Data updated successfully");

      res.status(200).json({
        success: true,
        message: "Data updated successfully",
        data: existingData,
      });
    } else {
      // Create new record
      const newData = new PartsMonitoring({
        aircraft,
        dateManufactured: dateManufactured || null,
        aircraftType: aircraftType || "",
        creepDamage: creepDamage || "",
        referenceData,
        parts,
        updatedBy: updatedBy || "system",
      });

      await newData.save();
      const audit = withActorId(
        req,
        `Parts monitoring created for aircraft: ${aircraft}`,
      );
      await auditLog(audit.action, audit.actorId);
      console.log("New data created successfully");

      res.status(201).json({
        success: true,
        message: "Data saved successfully",
        data: newData,
      });
    }
  } catch (error) {
    console.error("=== ERROR IN SAVE ===");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    res.status(500).json({
      success: false,
      message: "Error saving data",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// Get parts monitoring data for a specific aircraft
const getPartsMonitoring = async (req, res) => {
  try {
    const { aircraft } = req.params;
    console.log("Fetching data for aircraft:", aircraft);

    const data = await PartsMonitoring.findOne({ aircraft }).sort({
      lastUpdated: -1,
    });

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "No data found for this aircraft",
      });
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching parts monitoring data:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching data",
      error: error.message,
    });
  }
};

// Get all parts monitoring records (with pagination)
const getAllPartsMonitoring = async (req, res) => {
  try {
    const { page = 1, limit = 10, aircraft } = req.query;
    const query = aircraft ? { aircraft } : {};

    const total = await PartsMonitoring.countDocuments(query);
    const data = await PartsMonitoring.find(query)
      .sort({ lastUpdated: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.status(200).json({
      success: true,
      data,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching all parts monitoring data:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching data",
      error: error.message,
    });
  }
};

// Delete parts monitoring data
const deletePartsMonitoring = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await PartsMonitoring.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Data not found",
      });
    }
    const audit = withActorId(
      req,
      `Parts monitoring deleted for aircraft: ${deleted.aircraft}`,
    );
    await auditLog(audit.action, audit.actorId);

    res.status(200).json({
      success: true,
      message: "Data deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting parts monitoring data:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting data",
      error: error.message,
    });
  }
};

// Delete all data for a specific aircraft
const deleteAircraftData = async (req, res) => {
  try {
    const { aircraft } = req.params;

    const deleted = await PartsMonitoring.findOneAndDelete({ aircraft });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "No data found for this aircraft",
      });
    }
    const audit = withActorId(
      req,
      `Parts monitoring deleted for aircraft: ${aircraft}`,
    );
    await auditLog(audit.action, audit.actorId);

    res.status(200).json({
      success: true,
      message: `Data for aircraft ${aircraft} deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting aircraft data:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting data",
      error: error.message,
    });
  }
};

// Get all unique aircraft list
const getAircraftList = async (req, res) => {
  try {
    const aircraft = await PartsMonitoring.distinct("aircraft");

    res.status(200).json({
      success: true,
      data: aircraft,
    });
  } catch (error) {
    console.error("Error fetching aircraft list:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching aircraft list",
      error: error.message,
    });
  }
};
exports.module = {
  savePartsMonitoring,
  deleteAircraftData,
  deletePartsMonitoring,
  getAircraftList,
  getAllPartsMonitoring,
};
