const MaintenanceLog = require("../models/maintenanceLogModel");
const { auditLog } = require("./logsController"); // optional for logging
const {
  rewriteChecklistItemsWithAI,
} = require("../services/maintenanceLogTerminologyService");

const COMPLETED_TASK_STATUSES = new Set(["completed", "turned in", "approved"]);

const normalizeTaskCompletionStatus = (status) =>
  String(status || "").trim().toLowerCase();

const normalizeText = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const isTaskCompletedForMaintenanceLog = (task = {}) =>
  COMPLETED_TASK_STATUSES.has(normalizeTaskCompletionStatus(task.status));

const getTaskLogIdentifier = (task = {}) =>
  String(task.id || task._id || "").trim();

const toSentenceCase = (value = "") => {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
};

const ensureTrailingPeriod = (value = "") => {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }

  return /[.!?]$/.test(text) ? text : `${text}.`;
};

const joinUniqueSentences = (...values) =>
  Array.from(
    new Set(
      values
        .flat()
        .map((value) => ensureTrailingPeriod(value))
        .filter(Boolean),
    ),
  ).join(" ");

const getTaskSourceTexts = (task = {}) => {
  const checklistItems = Array.isArray(task.checklistItems) ? task.checklistItems : [];
  const checklistTaskNames = checklistItems.map((item) => item?.taskName).filter(Boolean);
  const checklistDescriptions = checklistItems
    .flatMap((item) => [item?.description, item?.correctiveAction, item?.inspectionName])
    .filter(Boolean);

  return {
    title: String(task.title || "").trim(),
    titleNormalized: normalizeText(task.title),
    checklistTaskNames,
    checklistDescriptions,
    rawCombined: [
      task.title,
      task.findings,
      task.defects,
      task.correctiveActionDone,
      task.completionNotes,
      ...checklistTaskNames,
      ...checklistDescriptions,
    ]
      .filter(Boolean)
      .join(" "),
  };
};

const inferTaskOperation = (task = {}) => {
  const { titleNormalized, rawCombined } = getTaskSourceTexts(task);
  const normalized = normalizeText(rawCombined || titleNormalized);

  const hasAny = (...keywords) => keywords.some((keyword) => normalized.includes(keyword));

  if (
    hasAny("replace", "replacement", "removed and installed", "remove and install")
  ) {
    return "replacement";
  }
  if (hasAny("installation", "install")) {
    return "installation";
  }
  if (hasAny("removal", "remove")) {
    return "removal";
  }
  if (hasAny("inspection", "inspect", "check", "examination")) {
    return "inspection";
  }
  if (hasAny("test", "testing", "operational check", "functional check")) {
    return "testing";
  }
  if (hasAny("troubleshoot", "fault isolation", "diagnostic", "trouble shooting")) {
    return "troubleshooting";
  }
  if (hasAny("repair", "rectif", "restore", "corrective")) {
    return "repair";
  }
  if (hasAny("service", "servicing", "lubricat", "grease")) {
    return "servicing";
  }
  if (hasAny("clean", "cleaning", "wash", "flush")) {
    return "cleaning";
  }
  if (hasAny("adjust", "rigging", "alignment", "calibration")) {
    return "adjustment";
  }

  return "general";
};

const buildTaskSubject = (task = {}) => {
  const { title, checklistTaskNames } = getTaskSourceTexts(task);
  const candidate = title || checklistTaskNames[0] || "the assigned maintenance task";
  return candidate.trim();
};

const buildDefectStatement = (task = {}) => {
  const discrepancyText = String(task.findings || task.defects || "").trim();
  const subject = buildTaskSubject(task);

  if (!discrepancyText) {
    return ensureTrailingPeriod(
      `Maintenance action was raised for ${subject}`,
    );
  }

  return ensureTrailingPeriod(
    `Reported discrepancy during ${subject}: ${toSentenceCase(discrepancyText)}`,
  );
};

const buildCorrectiveActionSummary = (task = {}) => {
  const operation = inferTaskOperation(task);
  const subject = buildTaskSubject(task);
  const checklistActions = Array.isArray(task.checklistItems)
    ? task.checklistItems
        .map((item) => item?.correctiveAction)
        .filter(Boolean)
        .map((value) => toSentenceCase(value))
    : [];
  const notes = [task.correctiveActionDone, task.completionNotes]
    .filter(Boolean)
    .map((value) => toSentenceCase(value));

  let leadStatement = "";

  switch (operation) {
    case "replacement":
      leadStatement = `Carried out removal and installation of ${subject} satisfactorily`;
      break;
    case "installation":
      leadStatement = `Carried out installation of ${subject} satisfactorily`;
      break;
    case "removal":
      leadStatement = `Carried out removal of ${subject} satisfactorily`;
      break;
    case "inspection":
      leadStatement = `Inspection of ${subject} was satisfactorily carried out`;
      break;
    case "testing":
      leadStatement = `Operational / functional test of ${subject} was satisfactorily carried out`;
      break;
    case "troubleshooting":
      leadStatement = `Fault isolation and troubleshooting for ${subject} were satisfactorily carried out`;
      break;
    case "repair":
      leadStatement = `Rectification / repair of ${subject} was satisfactorily carried out`;
      break;
    case "servicing":
      leadStatement = `Servicing of ${subject} was satisfactorily carried out`;
      break;
    case "cleaning":
      leadStatement = `Cleaning of ${subject} was satisfactorily carried out`;
      break;
    case "adjustment":
      leadStatement = `Adjustment of ${subject} was satisfactorily carried out`;
      break;
    default:
      leadStatement = `Assigned maintenance work for ${subject} was satisfactorily carried out`;
      break;
  }

  return joinUniqueSentences(
    leadStatement,
    ...notes,
    ...checklistActions,
  );
};

const buildChecklistWorkDescription = (item = {}, fallbackTask = {}) => {
  const sourceText = [
    item.taskName,
    item.inspectionName,
    item.description,
    item.correctiveAction,
    item.documentation,
  ]
    .filter(Boolean)
    .join(" ");

  const normalized = normalizeText(sourceText || fallbackTask.title);
  const subject = String(
    item.taskName ||
      item.inspectionName ||
      item.component ||
      fallbackTask.title ||
      "assigned maintenance item",
  ).trim();

  const hasAny = (...keywords) => keywords.some((keyword) => normalized.includes(keyword));

  if (hasAny("replace", "replacement", "removed and installed", "remove and install")) {
    return `Carried out removal and installation of ${subject} satisfactorily`;
  }
  if (hasAny("installation", "install")) {
    return `Carried out installation of ${subject} satisfactorily`;
  }
  if (hasAny("removal", "remove")) {
    return `Carried out removal of ${subject} satisfactorily`;
  }
  if (hasAny("inspection", "inspect", "check", "examination")) {
    return `Inspection of ${subject} was satisfactorily carried out`;
  }
  if (hasAny("test", "testing", "operational check", "functional check")) {
    return `Operational / functional test of ${subject} was satisfactorily carried out`;
  }
  if (hasAny("troubleshoot", "fault isolation", "diagnostic", "trouble shooting")) {
    return `Fault isolation and troubleshooting for ${subject} were satisfactorily carried out`;
  }
  if (hasAny("repair", "rectif", "restore", "corrective")) {
    return `Rectification / repair of ${subject} was satisfactorily carried out`;
  }
  if (hasAny("service", "servicing", "lubricat", "grease")) {
    return `Servicing of ${subject} was satisfactorily carried out`;
  }
  if (hasAny("clean", "cleaning", "wash", "flush")) {
    return `Cleaning of ${subject} was satisfactorily carried out`;
  }
  if (hasAny("adjust", "rigging", "alignment", "calibration")) {
    return `Adjustment of ${subject} was satisfactorily carried out`;
  }

  return `Maintenance work for ${subject} was satisfactorily carried out`;
};

const buildFallbackWorkDetailsFromTask = (task = {}) => {
  const checklistItems = Array.isArray(task.checklistItems) ? task.checklistItems : [];

  const checklistDescriptions = checklistItems
    .map((item) => ({
      description: ensureTrailingPeriod(buildChecklistWorkDescription(item, task)),
    }))
    .filter((item) => item.description);

  if (checklistDescriptions.length > 0) {
    return checklistDescriptions;
  }

  return [
    {
      description: ensureTrailingPeriod(buildCorrectiveActionSummary(task)),
    },
  ];
};

const buildFindingsWorkDetailFromTask = (task = {}) => {
  const findings = String(task.findings || "").trim();

  if (!findings) {
    return null;
  }

  return {
    description: ensureTrailingPeriod(
      `Task findings: ${toSentenceCase(findings)}`,
    ),
  };
};

const mergeFindingsIntoWorkDetails = (task = {}, workDetails = []) => {
  const findingsDetail = buildFindingsWorkDetailFromTask(task);

  if (!findingsDetail) {
    return workDetails;
  }

  const normalizedFindings = normalizeText(findingsDetail.description);
  const hasFindingsDetail = workDetails.some(
    (item) => normalizeText(item?.description) === normalizedFindings,
  );

  return hasFindingsDetail ? workDetails : [findingsDetail, ...workDetails];
};

const buildWorkDetailsFromTask = async (task = {}) => {
  const checklistItems = Array.isArray(task.checklistItems) ? task.checklistItems : [];
  if (!checklistItems.length) {
    return mergeFindingsIntoWorkDetails(
      task,
      buildFallbackWorkDetailsFromTask(task),
    );
  }

  const aiDescriptions = await rewriteChecklistItemsWithAI({
    taskTitle: task.title || "",
    aircraft: task.aircraft || "",
    checklistItems,
  });

  if (Array.isArray(aiDescriptions) && aiDescriptions.length === checklistItems.length) {
    return mergeFindingsIntoWorkDetails(task, aiDescriptions.map((description) => ({
      description: ensureTrailingPeriod(description),
    })));
  }

  return mergeFindingsIntoWorkDetails(
    task,
    buildFallbackWorkDetailsFromTask(task),
  );
};

const buildMaintenanceLogFromTask = async (task = {}) => {
  const completedStatus = normalizeTaskCompletionStatus(task.status);
  const sourceTaskId = getTaskLogIdentifier(task);
  const discoveredAt =
    task.dateDiscovered ||
    task.createdAt ||
    task.date ||
    new Date().toISOString();
  const rectifiedAt =
    task.dateRectified ||
    task.completedAt ||
    task.approvedAt ||
    new Date().toISOString();
  const workDetails = await buildWorkDetailsFromTask(task);

  return {
    sourceTaskId,
    taskTitle: task.title || "",
    sourceTaskStatus: task.status || "",
    aircraft: task.aircraft || "Unknown aircraft",
    defects: buildDefectStatement(task),
    dateDefectDiscovered: discoveredAt,
    correctiveActionDone: buildCorrectiveActionSummary(task),
    workDetails,
    dateDefectRectified: rectifiedAt,
    reportedBy: task.assignedToName || task.approvedBy || "Task Assignment",
    status: completedStatus === "approved" || task.isApproved ? "verified" : "unverified",
  };
};

const syncMaintenanceLogFromTask = async (task = {}) => {
  const sourceTaskId = getTaskLogIdentifier(task);
  if (!sourceTaskId) {
    return null;
  }

  if (!isTaskCompletedForMaintenanceLog(task)) {
    return MaintenanceLog.findOneAndDelete({ sourceTaskId });
  }

  const payload = await buildMaintenanceLogFromTask(task);
  const existingLog = await MaintenanceLog.findOne({ sourceTaskId });
  if (existingLog?.workDetailsLocked) {
    payload.workDetails = existingLog.workDetails;
    payload.workDetailsLocked = true;
  }

  return MaintenanceLog.findOneAndUpdate(
    { sourceTaskId },
    payload,
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );
};

const removeMaintenanceLogForTask = async (taskOrTaskId) => {
  const sourceTaskId =
    typeof taskOrTaskId === "string"
      ? taskOrTaskId.trim()
      : getTaskLogIdentifier(taskOrTaskId);

  if (!sourceTaskId) {
    return null;
  }

  return MaintenanceLog.findOneAndDelete({ sourceTaskId });
};

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
      workDetails,
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
      workDetails: Array.isArray(workDetails) ? workDetails : [],
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
      workDetails,
      workDetailsLocked,
    } = req.body;

    const existingLog = await MaintenanceLog.findById(req.params.id);
    if (!existingLog) {
      return res.status(404).json({ message: "Maintenance log not found" });
    }

    const hasWorkDetailsUpdate = Object.prototype.hasOwnProperty.call(
      req.body,
      "workDetails",
    );

    if (existingLog.workDetailsLocked && hasWorkDetailsUpdate) {
      return res.status(400).json({
        message: "Description of work has already been saved and locked.",
      });
    }

    const normalizedWorkDetails = Array.isArray(workDetails)
      ? workDetails.map((item) => ({
          description: String(item?.description || "").trim(),
        }))
      : existingLog.workDetails;

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
        workDetails: normalizedWorkDetails,
        workDetailsLocked: Boolean(workDetailsLocked || existingLog.workDetailsLocked),
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
  syncMaintenanceLogFromTask,
  removeMaintenanceLogForTask,
  isTaskCompletedForMaintenanceLog,
};
