// controllers/partsMonitoringController.js
const PartsMonitoring = require("../models/partsMonitoring");

exports.updateAircraftTotals = async (req, res) => {
  try {
    const { aircraft } = req.params;
    const { acftTT, n1Cycles, n2Cycles, landings } = req.body;

    if (!aircraft) {
      return res.status(400).json({
        success: false,
        message: "Aircraft is required",
      });
    }

    // Validate required fields
    if (
      acftTT === undefined ||
      n1Cycles === undefined ||
      n2Cycles === undefined ||
      landings === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required totals: acftTT, n1Cycles, n2Cycles, landings",
      });
    }

    // Find existing record or create a new one
    let partsData = await PartsMonitoring.findOne({ aircraft });

    if (!partsData) {
      // Create minimal record with empty parts array
      partsData = new PartsMonitoring({
        aircraft,
        referenceData: {
          today: new Date(),
          acftTT: 0,
          n1Cycles: 0,
          n2Cycles: 0,
          landings: 0,
        },
        parts: [],
        updatedBy: "flight_log_system",
      });
    }

    // Update the reference totals
    partsData.referenceData.acftTT = acftTT;
    partsData.referenceData.n1Cycles = n1Cycles;
    partsData.referenceData.n2Cycles = n2Cycles;
    partsData.referenceData.landings = landings;
    partsData.lastUpdated = Date.now();
    partsData.updatedBy = req.body.updatedBy || "flight_log_system";

    await partsData.save();

    res.status(200).json({
      success: true,
      message: "Aircraft totals updated successfully",
      data: partsData,
    });
  } catch (error) {
    console.error("Error updating aircraft totals:", error);
    res.status(500).json({
      success: false,
      message: "Error updating aircraft totals",
      error: error.message,
    });
  }
};

// Save or update parts monitoring data
exports.savePartsMonitoring = async (req, res) => {
  try {
    const { aircraft, referenceData, parts, updatedBy, dateManufactured, aircraftType, creepDamage } = req.body;

    if (!aircraft) {
      return res.status(400).json({ success: false, message: "Aircraft is required" });
    }
    if (!parts || !Array.isArray(parts)) {
      return res.status(400).json({ success: false, message: "Parts data is required and must be an array" });
    }

    let existingData = await PartsMonitoring.findOne({ aircraft });

    if (existingData) {
      existingData.referenceData = referenceData || existingData.referenceData;
      existingData.parts = parts;
      existingData.lastUpdated = Date.now();
      existingData.updatedBy = updatedBy || "system";
      await existingData.save();
      res.status(200).json({ success: true, message: "Data updated successfully", data: existingData });
    } else {
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
      res.status(201).json({ success: true, message: "Data saved successfully", data: newData });
    }
  } catch (error) {
    console.error("Error saving data:", error);
    res.status(500).json({ success: false, message: "Error saving data", error: error.message });
  }
};

// Get parts monitoring data for a specific aircraft
exports.getPartsMonitoring = async (req, res) => {
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
exports.getAllPartsMonitoring = async (req, res) => {
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
exports.deletePartsMonitoring = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await PartsMonitoring.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Data not found",
      });
    }

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
module.exports = {
  updateAircraftTotals,
  savePartsMonitoring,
  deleteAircraftData,
  deletePartsMonitoring,
  getAircraftList,
  getAllPartsMonitoring,
  getPartsMonitoring,
};
