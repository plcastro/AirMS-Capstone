const InspectionSchedule = require("../models/inspectionScheduleModel");
const InspectionTask = require("../models/inspectionTaskModel");

const INSPECTION_NAME_ALIASES = {
  "TBO Inspection": ["Time Between Overhaul"],
  "OC Inspection": ["ON CONDITION (OC)"],
  "OTL Inspection": ["OPERATING TIME LIMIT (OTL)"],
  "ALF Inspection": ["ALF"],
  "10 FH Inspection": ["10 FH"],
  "10 FH - 1 M Inspection": ["10 FH // 1 M"],
  "12 M Inspection": ["12 M"],
  "24 M Inspection": ["24 M"],
  "48 M Inspection": ["48 M"],
  "150 FH Inspection": ["150 FH"],
  "150 FH - 12 M Inspection": ["150 FH / 12 M", "150 FH // 12 M"],
  "750 FH Inspection": ["750 FH"],
  "750 FH - 24 M Inspection": ["750 FH // 24 M", "750 FH / 24 M"],
  "1500 FH Inspection": ["1500 FH"],
  "1500 FH - 48 M Inspection": ["1500 FH // 48 M", "1500 FH / 48 M"],
};

const getInspectionNameCandidates = (inspectionName) => {
  const candidates = new Set([inspectionName]);
  const aliases = INSPECTION_NAME_ALIASES[inspectionName] || [];

  aliases.forEach((alias) => candidates.add(alias));

  return Array.from(candidates);
};

const getInspectionSchedules = async (req, res) => {
  try {
    const { aircraftModel } = req.query;
    const query = {};

    if (aircraftModel) {
      query.aircraftModel = String(aircraftModel).trim().toUpperCase();
    }

    const inspections = await InspectionSchedule.find(query).sort({
      inspectionName: 1,
      aircraftModel: 1,
    });

    res.status(200).json(inspections);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getInspectionScheduleById = async (req, res) => {
  try {
    const inspection = await InspectionSchedule.findById(req.params.id);

    if (!inspection) {
      return res.status(404).json({ message: "Inspection schedule not found" });
    }

    res.status(200).json(inspection);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getTasksByInspection = async (req, res) => {
  try {
    const { inspectionName, aircraftModel } = req.query;

    if (!inspectionName) {
      return res.status(400).json({ message: "inspectionName is required" });
    }

    const query = {
      inspectionName: {
        $in: getInspectionNameCandidates(inspectionName),
      },
    };

    if (aircraftModel) {
      query.aircraftModel = aircraftModel;
    }

    const tasks = await InspectionTask.find(query).sort({
      taskId: 1,
    });

    res.status(200).json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getInspectionSchedules,
  getInspectionScheduleById,
  getTasksByInspection,
};
