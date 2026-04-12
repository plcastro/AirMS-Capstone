const InspectionSchedule = require("../models/inspectionScheduleModel");
const InspectionTask = require("../models/inspectionTaskModel");

const INSPECTION_NAME_ALIASES = {
  "TBO Inspection": ["Time Between Overhaul"],
  TBO: ["Time Between Overhaul", "TBO Inspection"],
  "OC Inspection": ["ON CONDITION (OC)"],
  OC: ["ON CONDITION (OC)", "OC Inspection"],
  "OTL Inspection": ["OPERATING TIME LIMIT (OTL)"],
  OTL: ["OPERATING TIME LIMIT (OTL)", "OTL Inspection"],
  "ALF Inspection": ["ALF"],
  ALF: ["ALF Inspection"],
  "10 FH Inspection": ["10 FH"],
  "10 FH": ["10 FH Inspection"],
  "10 FH - 1 M Inspection": ["10 FH / 1 M", "10 FH // 1 M", "10 FH - 1 M"],
  "10 FH - 1 M": ["10 FH / 1 M", "10 FH // 1 M", "10 FH - 1 M Inspection"],
  "12 M Inspection": ["12 M"],
  "12 M": ["12 M Inspection"],
  "24 M Inspection": ["24 M"],
  "24 M": ["24 M Inspection"],
  "48 M Inspection": ["48 M"],
  "48 M": ["48 M Inspection"],
  "150 FH Inspection": ["150 FH"],
  "150 FH": ["150 FH Inspection"],
  "150 FH - 12 M Inspection": ["150 FH / 12 M", "150 FH // 12 M", "150 FH - 12 M"],
  "150 FH - 12 M": ["150 FH / 12 M", "150 FH // 12 M", "150 FH - 12 M Inspection"],
  "600 FH Inspection": ["600 FH"],
  "600 FH": ["600 FH Inspection"],
  "600 FH - 24 M Inspection": ["600 FH / 24 M", "600 FH // 24 M", "600 FH - 24 M"],
  "600 FH - 24 M": ["600 FH / 24 M", "600 FH // 24 M", "600 FH - 24 M Inspection"],
  "750 FH Inspection": ["750 FH"],
  "750 FH": ["750 FH Inspection"],
  "750 FH - 24 M Inspection": ["750 FH // 24 M", "750 FH / 24 M", "750 FH - 24 M"],
  "750 FH - 24 M": ["750 FH // 24 M", "750 FH / 24 M", "750 FH - 24 M Inspection"],
  "1200 FH Inspection": ["1200 FH"],
  "1200 FH": ["1200 FH Inspection"],
  "1200 FH - 48 M Inspection": ["1200 FH / 48 M", "1200 FH // 48 M", "1200 FH - 48 M"],
  "1200 FH - 48 M": ["1200 FH / 48 M", "1200 FH // 48 M", "1200 FH - 48 M Inspection"],
  "1500 FH Inspection": ["1500 FH"],
  "1500 FH": ["1500 FH Inspection"],
  "1500 FH - 48 M Inspection": ["1500 FH // 48 M", "1500 FH / 48 M", "1500 FH - 48 M"],
  "1500 FH - 48 M": ["1500 FH // 48 M", "1500 FH / 48 M", "1500 FH - 48 M Inspection"],
};

const getInspectionNameCandidates = (inspectionName) => {
  const normalizedInspectionName = String(inspectionName || "").trim();
  const candidates = new Set([normalizedInspectionName]);
  const withoutInspectionSuffix = normalizedInspectionName
    .replace(/\s+Inspection$/i, "")
    .trim();
  const withInspectionSuffix = /inspection$/i.test(normalizedInspectionName)
    ? normalizedInspectionName
    : `${normalizedInspectionName} Inspection`;
  const slashVariant = withoutInspectionSuffix.replace(/\s-\s/g, " / ");
  const doubleSlashVariant = withoutInspectionSuffix.replace(/\s-\s/g, " // ");

  [
    withoutInspectionSuffix,
    withInspectionSuffix,
    slashVariant,
    doubleSlashVariant,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .forEach((value) => candidates.add(value));

  const aliases = [
    ...(INSPECTION_NAME_ALIASES[normalizedInspectionName] || []),
    ...(INSPECTION_NAME_ALIASES[withoutInspectionSuffix] || []),
    ...(INSPECTION_NAME_ALIASES[withInspectionSuffix] || []),
  ];

  aliases.forEach((alias) => candidates.add(alias));

  return Array.from(candidates);
};

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

    const normalizedInspectionName = String(inspectionName).trim();
    const inspectionCandidates = getInspectionNameCandidates(
      normalizedInspectionName,
    )
      .map((name) => String(name || "").trim())
      .filter(Boolean);

    const inspectionRegexCandidates = inspectionCandidates.map(
      (name) => new RegExp(`^${escapeRegex(name)}$`, "i"),
    );

    const query = {
      $or: [
        { inspectionName: { $in: inspectionCandidates } },
        { inspectionTypeFull: { $in: inspectionCandidates } },
        { inspectionName: { $in: inspectionRegexCandidates } },
        { inspectionTypeFull: { $in: inspectionRegexCandidates } },
      ],
    };

    if (aircraftModel) {
      const normalizedAircraftModel = String(aircraftModel).trim();
      query.aircraftModel = new RegExp(
        `^${escapeRegex(normalizedAircraftModel)}$`,
        "i",
      );
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
