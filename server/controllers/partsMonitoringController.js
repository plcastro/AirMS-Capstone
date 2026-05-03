// controllers/partsMonitoringController.js
const PartsMonitoring = require("../models/partsMonitoringModel");
const InspectionSchedule = require("../models/inspectionScheduleModel");
const InspectionTask = require("../models/inspectionTaskModel");
const TaskModel = require("../models/taskModel");
const MaintenancePriorityRule = require("../models/maintenancePriorityRuleModel");
const {
  getToday,
  parseDate,
  processDataWithFormulas,
} = require("../utils/partsMonitoringFormulas");
const { estimateInspectionSchedule } = require("../utils/inspectionTiming");

const MAJOR_INSPECTION_HOURS = new Set([10, 150, 600, 750, 1200, 1500]);
const TURNAROUND_TIE_HOURS = 15;
const TURNAROUND_TIE_DAYS = 7;
const TURNAROUND_TIE_RATIO = 0.05;
const DEFAULT_PRIORITY_RULES = {
  criticalDueDays: 5,
  criticalRemainingHours: 14,
  highDueDays: 7,
  highRemainingHours: 24,
  mediumDueDays: 14,
  longTurnaroundHours: 5,
};
const PRIORITY_RANKS = {
  Critical: 1,
  High: 2,
  Medium: 3,
  Low: 4,
};
const DEFAULT_REFERENCE_CELLS_BY_AIRCRAFT = {
  "RP-C7226": {
    J2: 498.8,
    N3: 1130.8,
  },
};

const normalizeAircraftModel = (value = "") => {
  const normalized = String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

  const matchedModel = normalized.match(/AS350\s*B3E?|AS350\s*B2/);
  const modelOnly = matchedModel ? matchedModel[0].replace(/\s+/g, "") : normalized.replace(/\s+/g, "");

  if (modelOnly === "AS350B3E" || modelOnly === "AS350B3") {
    return "AS350 B3";
  }

  if (modelOnly === "AS350B2") {
    return "AS350 B2";
  }

  return normalized;
};

const roundNumber = (value, decimals = 2) => {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return null;
  }

  const factor = 10 ** decimals;
  return Math.round(Number(value) * factor) / factor;
};

const parseNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = parseFloat(String(value).replace(/,/g, ""));
  return Number.isNaN(parsed) ? null : parsed;
};

const calculateRemainingDays = (dueDate, referenceDate = getToday()) => {
  if (!dueDate) {
    return null;
  }

  const due = dueDate instanceof Date ? dueDate : parseDate(dueDate);
  const reference =
    referenceDate instanceof Date ? referenceDate : parseDate(referenceDate);

  if (!due || !reference) {
    return null;
  }

  due.setHours(0, 0, 0, 0);
  reference.setHours(0, 0, 0, 0);

  return Math.round((due - reference) / (24 * 60 * 60 * 1000));
};

const parsePriorityRules = (query = {}) => {
  const parsedRules = { ...DEFAULT_PRIORITY_RULES };

  Object.keys(DEFAULT_PRIORITY_RULES).forEach((key) => {
    if (query[key] === undefined) {
      return;
    }

    const parsedValue = parseNumber(query[key]);
    if (parsedValue !== null) {
      parsedRules[key] = parsedValue;
    }
  });

  return parsedRules;
};

const mergePriorityRules = (baseRules = DEFAULT_PRIORITY_RULES, query = {}) => {
  const parsedRules = { ...baseRules };

  Object.keys(DEFAULT_PRIORITY_RULES).forEach((key) => {
    if (query[key] === undefined) {
      return;
    }

    const parsedValue = parseNumber(query[key]);
    if (parsedValue !== null) {
      parsedRules[key] = parsedValue;
    }
  });

  return parsedRules;
};

const sanitizePriorityRules = (source = {}) =>
  Object.keys(DEFAULT_PRIORITY_RULES).reduce((accumulator, key) => {
    const parsedValue = parseNumber(source[key]);
    accumulator[key] =
      parsedValue === null ? DEFAULT_PRIORITY_RULES[key] : parsedValue;
    return accumulator;
  }, {});

const getStoredPriorityRules = async () => {
  const storedRules = await MaintenancePriorityRule.findOne({
    profile: "default",
  }).lean();

  return storedRules
    ? sanitizePriorityRules(storedRules)
    : { ...DEFAULT_PRIORITY_RULES };
};

const canonicalizeInspectionKey = (value = "") => {
  let normalized = String(value || "")
    .toUpperCase()
    .replace(/\bNEXT\b/g, "")
    .replace(/\bINSPECTION\b/g, "")
    .replace(/\bTIME BETWEEN OVERHAUL\b/g, "TBO")
    .replace(/\bON CONDITION\b/g, "OC")
    .replace(/\bOPERATING TIME LIMIT\b/g, "OTL")
    .replace(/\./g, " ")
    .replace(/\s*\/\/\s*/g, "/")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s*-\s*/g, "/")
    .replace(/(\d+)\s*(?:FH|HRS?|H)\b/g, "$1FH")
    .replace(/(\d+)\s*(?:MTH|MONTHS?|M)\b/g, "$1M")
    .replace(/[^A-Z0-9/]/g, "")
    .trim();

  normalized = normalized.replace(/\/+/g, "/").replace(/^\/|\/$/g, "");

  return normalized;
};

const buildCanonicalKeyFromInterval = (interval = {}) => {
  const flightHours = parseNumber(interval.flightHours);
  const calendarMonths = parseNumber(interval.calendarMonths);

  if (flightHours && calendarMonths) {
    return `${flightHours}FH/${calendarMonths}M`;
  }
  if (flightHours) {
    return `${flightHours}FH`;
  }
  if (calendarMonths) {
    return `${calendarMonths}M`;
  }

  return "";
};

const dayLimitToMonths = (dayLimit) => {
  const numericDayLimit = parseNumber(dayLimit);

  if (!numericDayLimit) {
    return null;
  }

  const monthMappings = [
    { days: 30, months: 1 },
    { days: 91, months: 3 },
    { days: 182, months: 6 },
    { days: 365, months: 12 },
    { days: 730, months: 24 },
    { days: 1460, months: 48 },
    { days: 4380, months: 144 },
  ];

  const matchedMapping = monthMappings.find(
    ({ days }) => Math.abs(days - numericDayLimit) <= 3,
  );

  return matchedMapping ? matchedMapping.months : null;
};

const isRelevantInspectionSchedule = (schedule = {}) => {
  const flightHours = parseNumber(schedule?.interval?.flightHours);
  return Boolean(flightHours && MAJOR_INSPECTION_HOURS.has(flightHours));
};

const deriveInspectionKeyForSchedule = (schedule = {}) =>
  buildCanonicalKeyFromInterval(schedule.interval) ||
  canonicalizeInspectionKey(schedule.inspectionName);

const deriveInspectionKeyForTask = (task = {}) =>
  buildCanonicalKeyFromInterval(task.interval) ||
  canonicalizeInspectionKey(task.inspectionTypeFull) ||
  canonicalizeInspectionKey(task.inspectionName);

const deriveInspectionKeyForTaskRecord = (task = {}) =>
  canonicalizeInspectionKey(task.title) ||
  task.checklistItems
    .map((item) =>
      canonicalizeInspectionKey(
        item.inspectionTypeFull || item.inspectionName || item.interval?.specificInterval,
      ),
    )
    .find(Boolean) ||
  "";

const deriveInspectionKeyForPart = (part = {}) => {
  const componentKey = canonicalizeInspectionKey(part.componentName);

  if (componentKey) {
    return componentKey;
  }

  const flightHours = parseNumber(part.hourLimit1);
  const calendarMonths = dayLimitToMonths(part.dayLimit);

  if (flightHours && calendarMonths) {
    return `${flightHours}FH/${calendarMonths}M`;
  }

  if (flightHours) {
    return `${flightHours}FH`;
  }

  if (calendarMonths) {
    return `${calendarMonths}M`;
  }

  return "";
};

const computeUrgencyMetrics = (part = {}, referenceDate = getToday()) => {
  const remainingHours = parseNumber(part.timeRemaining);
  const dueDate = parseDate(part.dateDue);
  const calculatedRemainingDays = calculateRemainingDays(
    dueDate,
    referenceDate,
  );
  const importedRemainingDays = parseNumber(part.daysRemaining);
  const remainingDays =
    calculatedRemainingDays !== null
      ? calculatedRemainingDays
      : importedRemainingDays;
  const intervalHours = parseNumber(part.hourLimit1);
  const intervalDays = parseNumber(part.dayLimit);

  const hourRatio =
    remainingHours !== null && intervalHours
      ? remainingHours / intervalHours
      : null;
  const dayRatio =
    remainingDays !== null && intervalDays ? remainingDays / intervalDays : null;

  const ratios = [hourRatio, dayRatio].filter(
    (value) => value !== null && Number.isFinite(value),
  );

  return {
    remainingHours,
    remainingDays,
    dueAtHours: parseNumber(part.ttCycleDue),
    dueDate,
    hourRatio,
    dayRatio,
    urgencyRatio: ratios.length > 0 ? Math.min(...ratios) : Number.POSITIVE_INFINITY,
    isOverdue:
      (remainingHours !== null && remainingHours <= 0) ||
      (remainingDays !== null && remainingDays <= 0),
  };
};

const areDeadlinesClose = (left, right) => {
  const hoursClose =
    left.remainingHours !== null &&
    right.remainingHours !== null &&
    Math.abs(left.remainingHours - right.remainingHours) <= TURNAROUND_TIE_HOURS;

  const daysClose =
    left.remainingDays !== null &&
    right.remainingDays !== null &&
    Math.abs(left.remainingDays - right.remainingDays) <= TURNAROUND_TIE_DAYS;

  const ratioClose = Math.abs(left.urgencyRatio - right.urgencyRatio) <= TURNAROUND_TIE_RATIO;

  return hoursClose || daysClose || ratioClose;
};

const compareInspectionUrgency = (left, right) => {
  if (left.isOverdue !== right.isOverdue) {
    return left.isOverdue ? -1 : 1;
  }

  if (left.urgencyRatio !== right.urgencyRatio) {
    return left.urgencyRatio - right.urgencyRatio;
  }

  if (left.remainingDays !== null && right.remainingDays !== null) {
    return left.remainingDays - right.remainingDays;
  }

  if (left.remainingHours !== null && right.remainingHours !== null) {
    return left.remainingHours - right.remainingHours;
  }

  return 0;
};

const buildPriorityEvaluation = (
  inspection = {},
  estimatedTurnaroundHours = null,
  rules = DEFAULT_PRIORITY_RULES,
) => {
  const reasons = [];
  let priorityLevel = "Low";
  const overdueByHours =
    inspection.remainingHours !== null && inspection.remainingHours <= 0;
  const overdueByDays =
    inspection.remainingDays !== null && inspection.remainingDays <= 0;

  if (overdueByHours && overdueByDays) {
    priorityLevel = "Critical";
    reasons.push("Inspection is already overdue by flight hours and calendar days");
  } else if (overdueByHours) {
    priorityLevel = "Critical";
    reasons.push("Inspection is already overdue by flight hours");
  } else if (overdueByDays) {
    priorityLevel = "Critical";
    reasons.push("Inspection is already overdue by calendar days");
  } else if (
    inspection.remainingDays !== null &&
    inspection.remainingDays <= rules.criticalDueDays
  ) {
    priorityLevel = "Critical";
    reasons.push(`Due within ${rules.criticalDueDays} day(s)`);
  } else if (
    inspection.remainingHours !== null &&
    inspection.remainingHours <= rules.criticalRemainingHours
  ) {
    priorityLevel = "Critical";
    reasons.push(`Remaining flight hours at or below ${rules.criticalRemainingHours}`);
  } else if (
    inspection.remainingDays !== null &&
    inspection.remainingDays <= rules.highDueDays
  ) {
    priorityLevel = "High";
    reasons.push(`Due within ${rules.highDueDays} day(s)`);
  } else if (
    inspection.remainingHours !== null &&
    inspection.remainingHours <= rules.highRemainingHours
  ) {
    priorityLevel = "High";
    reasons.push(`Remaining flight hours at or below ${rules.highRemainingHours}`);
  } else if (
    inspection.remainingDays !== null &&
    inspection.remainingDays <= rules.mediumDueDays
  ) {
    priorityLevel = "Medium";
    reasons.push(`Due within ${rules.mediumDueDays} day(s)`);
  } else if (
    estimatedTurnaroundHours !== null &&
    estimatedTurnaroundHours >= rules.longTurnaroundHours
  ) {
    priorityLevel = "Medium";
    reasons.push(
      `Long turnaround at or above ${rules.longTurnaroundHours} hour(s)`,
    );
  } else {
    reasons.push("No escalation threshold triggered");
  }

  return {
    priorityLevel,
    priorityRank: PRIORITY_RANKS[priorityLevel],
    reasons,
  };
};

const buildPriorityReason = (inspection = {}, estimatedTurnaroundHours = null, usedHistoricalEstimate = false) => {
  const dueByHours =
    inspection.remainingHours !== null
      ? `${roundNumber(inspection.remainingHours, 1)} FH remaining`
      : null;
  const dueByDays =
    inspection.remainingDays !== null
      ? `${roundNumber(inspection.remainingDays, 0)} day(s) remaining`
      : null;
  const turnaroundReason =
    estimatedTurnaroundHours !== null
      ? `turnaround ${roundNumber(estimatedTurnaroundHours, 2)} hr${usedHistoricalEstimate ? " (historical)" : " (estimated)"}`
      : null;

  const overdueQualifier =
    inspection.remainingHours !== null &&
    inspection.remainingHours <= 0 &&
    inspection.remainingDays !== null &&
    inspection.remainingDays <= 0
      ? "overdue by flight hours and calendar days"
      : inspection.remainingHours !== null && inspection.remainingHours <= 0
        ? "overdue by flight hours"
        : inspection.remainingDays !== null && inspection.remainingDays <= 0
          ? "overdue by calendar days"
          : null;

  return [overdueQualifier, dueByHours, dueByDays, turnaroundReason]
    .filter(Boolean)
    .join(" | ");
};

const getDueBasis = (inspection = {}) => {
  const overdueByHours =
    inspection.remainingHours !== null && inspection.remainingHours <= 0;
  const overdueByDays =
    inspection.remainingDays !== null && inspection.remainingDays <= 0;

  if (overdueByHours && overdueByDays) {
    return "hours-and-calendar";
  }

  if (overdueByHours) {
    return "hours";
  }

  if (overdueByDays) {
    return "calendar";
  }

  if (
    inspection.remainingHours !== null &&
    inspection.remainingDays !== null
  ) {
    return inspection.remainingHours <= inspection.remainingDays
      ? "hours"
      : "calendar";
  }

  if (inspection.remainingHours !== null) {
    return "hours";
  }

  if (inspection.remainingDays !== null) {
    return "calendar";
  }

  return "unknown";
};

const resolveAircraftModelForRecord = (record = {}, computedParts = [], schedulesByModel = new Map()) => {
  const preferredModel = normalizeAircraftModel(record.aircraftType);
  const partKeys = new Set(
    computedParts
      .filter((part) => part.rowType !== "header")
      .map((part) => deriveInspectionKeyForPart(part))
      .filter(Boolean),
  );

  if (preferredModel && schedulesByModel.has(preferredModel)) {
    const scheduleMap = schedulesByModel.get(preferredModel);
    const matchedCount = Array.from(partKeys).filter((key) => scheduleMap.has(key)).length;

    if (matchedCount > 0) {
      return preferredModel;
    }
  }

  let bestModel = preferredModel || "";
  let bestMatchCount = 0;

  schedulesByModel.forEach((scheduleMap, modelKey) => {
    const matchedCount = Array.from(partKeys).filter((key) => scheduleMap.has(key)).length;

    if (matchedCount > bestMatchCount) {
      bestMatchCount = matchedCount;
      bestModel = modelKey;
    }
  });

  return bestMatchCount > 0 ? bestModel : preferredModel;
};

exports.updateAircraftTotals = async (req, res) => {
  try {
    const { aircraft } = req.params;
    const { acftTT, engTT, n1Cycles, n2Cycles, landings } = req.body;

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
    partsData.referenceData.engTT = engTT ?? partsData.referenceData.engTT ?? acftTT;
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

exports.getMaintenancePriority = async (req, res) => {
  try {
    const debugMode = String(req.query.debug || "") === "1";
    const storedPriorityRules = await getStoredPriorityRules();
    const priorityRules = mergePriorityRules(storedPriorityRules, req.query);
    const [partsMonitoringRecords, inspectionSchedules, inspectionTasks, taskHistory] =
      await Promise.all([
        PartsMonitoring.find({}).sort({ aircraft: 1 }),
        InspectionSchedule.find({}).sort({ inspectionName: 1, aircraftModel: 1 }),
        InspectionTask.find({}).sort({ taskId: 1 }),
        TaskModel.find({ maintenanceType: "Inspection" }).sort({ createdAt: -1 }),
      ]);

    const schedulesByModel = new Map();
    inspectionSchedules.forEach((schedule) => {
      if (!isRelevantInspectionSchedule(schedule)) {
        return;
      }

      const aircraftModel = normalizeAircraftModel(schedule.aircraftModel);
      const inspectionKey = deriveInspectionKeyForSchedule(schedule);

      if (!inspectionKey) {
        return;
      }

      if (!schedulesByModel.has(aircraftModel)) {
        schedulesByModel.set(aircraftModel, new Map());
      }

      schedulesByModel.get(aircraftModel).set(inspectionKey, schedule);
    });

    const inspectionTasksByModel = new Map();
    inspectionTasks.forEach((task) => {
      const aircraftModel = normalizeAircraftModel(task.aircraftModel);
      const inspectionKey = deriveInspectionKeyForTask(task);

      if (!inspectionKey) {
        return;
      }

      if (!inspectionTasksByModel.has(aircraftModel)) {
        inspectionTasksByModel.set(aircraftModel, new Map());
      }

      if (!inspectionTasksByModel.get(aircraftModel).has(inspectionKey)) {
        inspectionTasksByModel.get(aircraftModel).set(inspectionKey, []);
      }

      inspectionTasksByModel.get(aircraftModel).get(inspectionKey).push(task);
    });

    const historicalTurnaroundByInspection = new Map();
    taskHistory.forEach((task) => {
      const inspectionKey = deriveInspectionKeyForTaskRecord(task);
      if (!inspectionKey) {
        return;
      }

      const candidateHours = [
        parseNumber(task?.performance?.actualHours),
        parseNumber(task?.performance?.estimatedHours),
      ].find((value) => value !== null && value > 0);

      if (candidateHours === undefined) {
        return;
      }

      if (!historicalTurnaroundByInspection.has(inspectionKey)) {
        historicalTurnaroundByInspection.set(inspectionKey, []);
      }

      historicalTurnaroundByInspection.get(inspectionKey).push(candidateHours);
    });

    const debugRecords = [];

    const rankings = partsMonitoringRecords
      .map((record) => {
        const refs = {
          today: getToday(),
          acftTT: parseNumber(record?.referenceData?.acftTT) || 0,
          engTT:
            parseNumber(record?.referenceData?.engTT) ??
            parseNumber(record?.referenceData?.acftTT) ??
            0,
          n1Cycles: parseNumber(record?.referenceData?.n1Cycles) || 0,
          n2Cycles: parseNumber(record?.referenceData?.n2Cycles) || 0,
          landings: parseNumber(record?.referenceData?.landings) || 0,
          referenceCells:
            record?.referenceData?.referenceCells ||
            DEFAULT_REFERENCE_CELLS_BY_AIRCRAFT[record.aircraft] ||
            {},
        };

        const computedParts = processDataWithFormulas(record.parts || [], refs);
        const aircraftModel = resolveAircraftModelForRecord(
          record,
          computedParts,
          schedulesByModel,
        );
        const scheduleMap = schedulesByModel.get(aircraftModel);

        if (!scheduleMap || scheduleMap.size === 0) {
          if (debugMode) {
            debugRecords.push({
              aircraft: record.aircraft,
              aircraftType: record.aircraftType || "",
              resolvedAircraftModel: aircraftModel || "",
              scheduleMatchCount: 0,
              matchedInspectionCount: 0,
              scheduleKeys: [],
              sampleInspectionRows: computedParts
                .filter((part) => part.rowType !== "header")
                .slice(0, 10)
                .map((part) => ({
                  componentName: part.componentName,
                  inspectionKey: deriveInspectionKeyForPart(part),
                })),
            });
          }
          return null;
        }

        const candidateInspections = computedParts
          .filter((part) => part.rowType !== "header")
          .map((part) => {
            const inspectionKey = deriveInspectionKeyForPart(part);
            if (!inspectionKey || !scheduleMap.has(inspectionKey)) {
              return null;
            }

            const schedule = scheduleMap.get(inspectionKey);
            const urgency = computeUrgencyMetrics(part, refs.today);

            return {
              inspectionKey,
              schedule,
              part,
              ...urgency,
            };
          })
          .filter(Boolean)
          .sort(compareInspectionUrgency);

        if (debugMode) {
          debugRecords.push({
            aircraft: record.aircraft,
            aircraftType: record.aircraftType || "",
            resolvedAircraftModel: aircraftModel || "",
            scheduleMatchCount: scheduleMap.size,
            matchedInspectionCount: candidateInspections.length,
            scheduleKeys: Array.from(scheduleMap.keys()).slice(0, 20),
            sampleInspectionRows: computedParts
              .filter((part) => part.rowType !== "header")
              .slice(0, 20)
              .map((part) => ({
                componentName: part.componentName,
                inspectionKey: deriveInspectionKeyForPart(part),
                matchesSchedule: scheduleMap.has(deriveInspectionKeyForPart(part)),
                timeRemaining: part.timeRemaining,
                daysRemaining: part.daysRemaining,
                dateDue: part.dateDue,
                ttCycleDue: part.ttCycleDue,
              })),
            matchedRows: computedParts
              .filter((part) => part.rowType !== "header")
              .filter((part) => {
                const inspectionKey = deriveInspectionKeyForPart(part);
                return Boolean(inspectionKey && scheduleMap.has(inspectionKey));
              })
              .slice(0, 10)
              .map((part) => ({
                componentName: part.componentName,
                inspectionKey: deriveInspectionKeyForPart(part),
                timeRemaining: part.timeRemaining,
                daysRemaining: part.daysRemaining,
                dateDue: part.dateDue,
                ttCycleDue: part.ttCycleDue,
              })),
          });
        }

        if (candidateInspections.length === 0) {
          return null;
        }

        const nextInspection = candidateInspections[0];
        const inspectionTaskGroup =
          inspectionTasksByModel.get(aircraftModel)?.get(nextInspection.inspectionKey) || [];

        const historicalDurations =
          historicalTurnaroundByInspection.get(nextInspection.inspectionKey) || [];

        const historicalAverage =
          historicalDurations.length > 0
            ? historicalDurations.reduce((sum, value) => sum + value, 0) /
              historicalDurations.length
            : null;

        const checklistEstimate =
          inspectionTaskGroup.length > 0
            ? estimateInspectionSchedule(inspectionTaskGroup)
            : null;

        const estimatedTurnaroundHours = roundNumber(
          historicalAverage !== null ? historicalAverage : checklistEstimate?.hours,
          2,
        );

        const priorityEvaluation = buildPriorityEvaluation(
          nextInspection,
          estimatedTurnaroundHours,
          priorityRules,
        );

        return {
          aircraft: record.aircraft,
          aircraftModel,
          nextInspection: nextInspection.schedule.inspectionName,
          inspectionKey: nextInspection.inspectionKey,
          scheduleReference: nextInspection.schedule.msmReference || "",
          dueByHours: roundNumber(nextInspection.remainingHours, 1),
          dueByDays: roundNumber(nextInspection.remainingDays, 0),
          dueDate: nextInspection.dueDate ? nextInspection.dueDate.toISOString() : null,
          dueBasis: getDueBasis(nextInspection),
          dueAtHours: roundNumber(nextInspection.dueAtHours, 1),
          estimatedTurnaroundHours,
          checklistItemCount: inspectionTaskGroup.length,
          urgencyRatio: roundNumber(nextInspection.urgencyRatio, 4),
          priorityLevel: priorityEvaluation.priorityLevel,
          priorityRank: priorityEvaluation.priorityRank,
          priorityReason: buildPriorityReason(
            nextInspection,
            estimatedTurnaroundHours,
            historicalAverage !== null,
          ),
          priorityTriggers: priorityEvaluation.reasons,
          sourceRow: nextInspection.part.componentName || "",
          usedHistoricalEstimate: historicalAverage !== null,
        };
      })
      .filter(Boolean);

    rankings.sort((left, right) => {
      if (left.priorityRank !== right.priorityRank) {
        return left.priorityRank - right.priorityRank;
      }

      const leftInspection = {
        isOverdue:
          (left.dueByHours !== null && left.dueByHours <= 0) ||
          (left.dueByDays !== null && left.dueByDays <= 0),
        urgencyRatio: left.urgencyRatio ?? Number.POSITIVE_INFINITY,
        remainingHours: left.dueByHours,
        remainingDays: left.dueByDays,
      };
      const rightInspection = {
        isOverdue:
          (right.dueByHours !== null && right.dueByHours <= 0) ||
          (right.dueByDays !== null && right.dueByDays <= 0),
        urgencyRatio: right.urgencyRatio ?? Number.POSITIVE_INFINITY,
        remainingHours: right.dueByHours,
        remainingDays: right.dueByDays,
      };

      const urgencyComparison = compareInspectionUrgency(leftInspection, rightInspection);

      if (urgencyComparison === 0) {
        return (left.estimatedTurnaroundHours || Number.POSITIVE_INFINITY) -
          (right.estimatedTurnaroundHours || Number.POSITIVE_INFINITY);
      }

      if (areDeadlinesClose(leftInspection, rightInspection)) {
        const turnaroundDifference =
          (left.estimatedTurnaroundHours || Number.POSITIVE_INFINITY) -
          (right.estimatedTurnaroundHours || Number.POSITIVE_INFINITY);

        if (turnaroundDifference !== 0) {
          return turnaroundDifference;
        }
      }

      return urgencyComparison;
    });

    const rankedData = rankings.map((item, index) => ({
      rank: index + 1,
      ...item,
    }));

    res.status(200).json({
      success: true,
      data: rankedData,
      meta: {
        rules: priorityRules,
        debug: debugMode
          ? {
              partsMonitoringCount: partsMonitoringRecords.length,
              scheduleCount: inspectionSchedules.length,
              taskCount: inspectionTasks.length,
              debugRecords,
            }
          : undefined,
        aircraftCount: rankedData.length,
        tieBreakHours: TURNAROUND_TIE_HOURS,
        tieBreakDays: TURNAROUND_TIE_DAYS,
        tieBreakUrgencyRatio: TURNAROUND_TIE_RATIO,
      },
    });
  } catch (error) {
    console.error("Error generating maintenance priority:", error);
    res.status(500).json({
      success: false,
      message: "Error generating maintenance priority",
      error: error.message,
    });
  }
};

exports.getMaintenancePriorityRules = async (req, res) => {
  try {
    const rules = await getStoredPriorityRules();

    res.status(200).json({
      success: true,
      data: rules,
    });
  } catch (error) {
    console.error("Error fetching maintenance priority rules:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching maintenance priority rules",
      error: error.message,
    });
  }
};

exports.saveMaintenancePriorityRules = async (req, res) => {
  try {
    const rules = sanitizePriorityRules(req.body || {});

    const savedRules = await MaintenancePriorityRule.findOneAndUpdate(
      { profile: "default" },
      {
        profile: "default",
        ...rules,
        updatedBy: req.body?.updatedBy || "maintenance_manager",
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    ).lean();

    res.status(200).json({
      success: true,
      message: "Maintenance priority rules saved successfully",
      data: sanitizePriorityRules(savedRules),
    });
  } catch (error) {
    console.error("Error saving maintenance priority rules:", error);
    res.status(500).json({
      success: false,
      message: "Error saving maintenance priority rules",
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
  getMaintenancePriorityRules: exports.getMaintenancePriorityRules,
  getMaintenancePriority: exports.getMaintenancePriority,
  saveMaintenancePriorityRules: exports.saveMaintenancePriorityRules,
  updateAircraftTotals: exports.updateAircraftTotals,
  savePartsMonitoring: exports.savePartsMonitoring,
  deleteAircraftData,
  deletePartsMonitoring: exports.deletePartsMonitoring,
  getAircraftList,
  getAllPartsMonitoring: exports.getAllPartsMonitoring,
  getPartsMonitoring: exports.getPartsMonitoring,
};
