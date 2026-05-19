const AircraftModel = require("../models/aircraftModel");
const TechnicalLog = require("../models/technicalLogModel");

const { auditLog } = require("./logsController");

const getAircraftTailNumbers = async (req, res) => {
  try {
    const aircraftList = await AircraftModel.find({}, "tailNum");
    res.status(200).json(aircraftList);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAircraftWithBases = async (req, res) => {
  try {
    const aircraftList = await AircraftModel.find({}, "tailNum base").lean();
    res.status(200).json({
      status: "Ok",
      data: aircraftList,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getTechnicalLogs = async (req, res) => {
  try {
    const logs = await TechnicalLog.find().sort({ offBlockUtc: -1 });
    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getAircraftTailNumbers,
  getAircraftWithBases,
  getTechnicalLogs,
};
