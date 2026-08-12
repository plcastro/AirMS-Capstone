const mongoose = require("mongoose");
const TaskModel = require("../models/taskModel");
const AircraftModel = require("../models/aircraftModel");
const { auditLog } = require("./logsController");
const { createTaskNotifications } = require("../utils/taskNotificationService");
const {
  syncMaintenanceLogFromTask,
  removeMaintenanceLogForTask,
} = require("./maintenanceLogController");
const { publishTypedEvent } = require("../utils/realtimeEvents");
const getAuditActorId = (req, fallbackId = null) => req.user?.id || fallbackId;
const BUSY_TASK_STATUSES = ["Pending", "Ongoing", "Returned"];
const withActorId = (req, action, fallbackId = null) => {
  const actorId = getAuditActorId(req, fallbackId);
  return {
    actorId,
    action: actorId ? `${action} (actorId: ${actorId})` : action,
  };
};

const buildTaskIdentifierQuery = (value) => {
  const identifier = String(value || "").trim();
  const conditions = [{ id: identifier }];

  if (mongoose.Types.ObjectId.isValid(identifier)) {
    conditions.push({ _id: identifier });
  }

  return { $or: conditions };
};

const findBusyTaskForMechanic = (mechanicId) => {
  const assignedTo = String(mechanicId || "").trim();
  if (!assignedTo) return null;

  return TaskModel.findOne({
    assignedTo,
    status: { $in: BUSY_TASK_STATUSES },
  }).lean();
};

const sanitizeTaskPayload = (payload = {}) => {
  const sanitized = { ...payload };
  delete sanitized.assignedMechanic;
  return sanitized;
};

const serializeTask = (task) => {
  if (!task) {
    return task;
  }

  const plainTask =
    typeof task.toObject === "function" ? task.toObject() : { ...task };

  delete plainTask.assignedMechanic;

  return plainTask;
};

const toValidDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const roundHours = (value) => Math.round(value * 100) / 100;

const formatLegacyDateTime = (value) => {
  const date = toValidDate(value);
  if (!date) return "";

  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${formattedDate} at ${formattedTime}`;
};

const normalizeDateInput = (...values) => {
  for (const value of values) {
    const date = toValidDate(value);
    if (date) {
      return date.toISOString();
    }
  }

  return null;
};

const hasOwn = (object, key) =>
  Object.prototype.hasOwnProperty.call(object || {}, key);

const resolveDateField = (payload = {}, key, existingValue, ...fallbackValues) => {
  if (hasOwn(payload, key)) {
    const explicitValue = payload[key];
    if (explicitValue === null || explicitValue === "") {
      return null;
    }

    return normalizeDateInput(explicitValue, ...fallbackValues);
  }

  return normalizeDateInput(existingValue, ...fallbackValues);
};

const buildPerformanceData = (existingTask, nextTask) => {
  const performance = {
    ...(existingTask?.performance || {}),
    ...(nextTask?.performance || {}),
  };

  const createdAt = toValidDate(nextTask?.createdAt || existingTask?.createdAt);
  const startedAt = toValidDate(nextTask?.startDateTime || existingTask?.startDateTime);
  const completedAt = toValidDate(nextTask?.completedAt);
  const dueAt = toValidDate(nextTask?.dueDate || nextTask?.endDateTime || existingTask?.dueDate || existingTask?.endDateTime);

  if (startedAt && completedAt) {
    performance.actualHours = roundHours(
      (completedAt.getTime() - startedAt.getTime()) / (1000 * 60 * 60),
    );
  }

  if (createdAt && completedAt) {
    performance.turnaroundHours = roundHours(
      (completedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60),
    );
    performance.downtimeHours = performance.turnaroundHours;
  }

  if (completedAt && dueAt) {
    performance.completedWithinSchedule =
      completedAt.getTime() <= dueAt.getTime();
  }

  return performance;
};

const prepareTaskUpdate = (existingTask, payload = {}) => {
  const sanitizedPayload = sanitizeTaskPayload(payload);
  const nextTask = {
    ...serializeTask(existingTask),
    ...sanitizedPayload,
  };

  const currentStatus = existingTask?.status;
  const nextStatus = sanitizedPayload.status || currentStatus;
  const nowIso = new Date().toISOString();

  nextTask.completedAt = resolveDateField(
    sanitizedPayload,
    "completedAt",
    existingTask?.completedAt,
  );
  nextTask.reviewedAt = resolveDateField(
    sanitizedPayload,
    "reviewedAt",
    existingTask?.reviewedAt,
  );
  nextTask.returnedAt = resolveDateField(
    sanitizedPayload,
    "returnedAt",
    existingTask?.returnedAt,
    sanitizedPayload.returnedDate,
    existingTask?.returnedDate,
  );
  nextTask.approvedAt = resolveDateField(
    sanitizedPayload,
    "approvedAt",
    existingTask?.approvedAt,
    sanitizedPayload.approvedDate,
    existingTask?.approvedDate,
  );

  if (nextStatus === "Turned in" || nextStatus === "Completed") {
    nextTask.completedAt =
      nextTask.completedAt ||
      nowIso;
  }

  if (nextStatus === "Returned") {
    nextTask.reviewedAt =
      nextTask.reviewedAt ||
      nowIso;
    nextTask.returnedAt =
      nextTask.returnedAt ||
      nowIso;
    nextTask.isApproved = false;
  }

  if (nextStatus === "Approved" || sanitizedPayload.isApproved === true) {
    nextTask.reviewedAt =
      nextTask.reviewedAt ||
      nowIso;
    nextTask.approvedAt =
      nextTask.approvedAt ||
      nowIso;
    nextTask.isApproved = true;
  }

  if (
    currentStatus === "Returned" &&
    nextStatus !== "Returned" &&
    !sanitizedPayload.returnedAt
  ) {
    nextTask.returnedAt = existingTask?.returnedAt || nextTask.returnedAt || null;
  }

  nextTask.performance = buildPerformanceData(existingTask, nextTask);
  nextTask.approvedDate = formatLegacyDateTime(nextTask.approvedAt);
  nextTask.returnedDate = formatLegacyDateTime(nextTask.returnedAt);

  return nextTask;
};

const buildWritableTaskUpdate = (taskData) => {
  const writableTask = { ...taskData };
  delete writableTask._id;
  delete writableTask.__v;
  delete writableTask.createdAt;
  delete writableTask.updatedAt;
  return writableTask;
};

const validateTaskSchedule = (taskData = {}) => {
  const startDate = toValidDate(taskData.startDateTime);
  const endDate = toValidDate(taskData.endDateTime);

  if (!startDate || !endDate) {
    return null;
  }

  if (endDate.getTime() <= startDate.getTime()) {
    return "End date/time must be after the start date/time.";
  }

  return null;
};

const isKnownBase = (value) => {
  const normalized = String(value || "").trim().toUpperCase();
  return normalized && !["UNKNOWN", "N/A", "NA", "UNASSIGNED"].includes(normalized);
};

const firstKnownBase = (...values) => {
  const match = values.find(isKnownBase);
  return match ? String(match).trim().toUpperCase() : "";
};

const normalizeBase = (task = {}, aircraftBaseByTail = new Map()) =>
  firstKnownBase(
    task.base,
    task.locationBase,
    task.assignedBase,
    task.stationBase,
    aircraftBaseByTail.get(String(task.aircraft || "").trim().toUpperCase()),
  ) || "UNKNOWN";

const getDiscoveredAt = (task = {}) =>
  toValidDate(
    task?.maintenanceHistory?.defectDiscoveredAt ||
      task?.dateDiscovered ||
      task?.createdAt,
  );

const getRectifiedAt = (task = {}) =>
  toValidDate(
    task?.maintenanceHistory?.defectRectifiedAt ||
      task?.dateRectified ||
      task?.completedAt ||
      task?.approvedAt,
  );

const isDamageRelated = (task = {}) => {
  const hasDefectNotes = Boolean(
    String(task?.defects || "").trim() || String(task?.findings || "").trim(),
  );
  const maintenanceType = String(task?.maintenanceType || "").toLowerCase();
  return hasDefectNotes || maintenanceType.includes("corrective");
};

const isSameCalendarDay = (leftDate, rightDate) =>
  leftDate.getFullYear() === rightDate.getFullYear() &&
  leftDate.getMonth() === rightDate.getMonth() &&
  leftDate.getDate() === rightDate.getDate();

const getBaseMaintenanceAnalytics = async (req, res) => {
  try {
    const [tasks, aircraft] = await Promise.all([
      TaskModel.find({}),
      AircraftModel.find({}, "tailNum base").lean(),
    ]);
    const aircraftBaseByTail = new Map(
      aircraft
        .filter((item) => item?.tailNum && isKnownBase(item?.base))
        .map((item) => [
          String(item.tailNum).trim().toUpperCase(),
          String(item.base).trim().toUpperCase(),
        ]),
    );
    const byBase = {};
    const totals = {
      damagedCount: 0,
      repairedCount: 0,
      sameDayRepairCount: 0,
      rectificationHoursTotal: 0,
      rectificationSamples: 0,
      averageRectificationHours: 0,
    };

    tasks.forEach((task) => {
      const base = normalizeBase(task, aircraftBaseByTail);
      if (!byBase[base]) {
        byBase[base] = {
          base,
          damagedCount: 0,
          repairedCount: 0,
          sameDayRepairCount: 0,
          rectificationHoursTotal: 0,
          rectificationSamples: 0,
          averageRectificationHours: 0,
        };
      }

      const discoveredAt = getDiscoveredAt(task);
      const rectifiedAt = getRectifiedAt(task);
      const damageRelated = isDamageRelated(task);

      if (damageRelated) {
        byBase[base].damagedCount += 1;
        totals.damagedCount += 1;
      }

      if (rectifiedAt) {
        byBase[base].repairedCount += 1;
        totals.repairedCount += 1;
      }

      if (discoveredAt && rectifiedAt) {
        const rectificationHours =
          (rectifiedAt.getTime() - discoveredAt.getTime()) / (1000 * 60 * 60);

        if (Number.isFinite(rectificationHours) && rectificationHours >= 0) {
          byBase[base].rectificationHoursTotal += rectificationHours;
          byBase[base].rectificationSamples += 1;
          totals.rectificationHoursTotal += rectificationHours;
          totals.rectificationSamples += 1;
        }

        const sameDay =
          task?.maintenanceHistory?.sameDayRepair === true ||
          isSameCalendarDay(discoveredAt, rectifiedAt);

        if (sameDay) {
          byBase[base].sameDayRepairCount += 1;
          totals.sameDayRepairCount += 1;
        }
      }
    });

    const baseRows = Object.values(byBase)
      .map((row) => ({
        ...row,
        averageRectificationHours:
          row.rectificationSamples > 0
            ? roundHours(row.rectificationHoursTotal / row.rectificationSamples)
            : 0,
      }))
      .sort((left, right) => right.damagedCount - left.damagedCount);

    const topDamagedBase =
      [...baseRows].sort((left, right) => right.damagedCount - left.damagedCount)[0] ||
      null;
    const topRepairedBase =
      [...baseRows].sort((left, right) => right.repairedCount - left.repairedCount)[0] ||
      null;

    totals.averageRectificationHours =
      totals.rectificationSamples > 0
        ? roundHours(totals.rectificationHoursTotal / totals.rectificationSamples)
        : 0;

    return res.status(200).json({
      status: "Ok",
      data: {
        byBase: baseRows,
        topDamagedBase,
        topRepairedBase,
        totals,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const createTask = async (req, res) => {
  try {
    const taskData = prepareTaskUpdate(null, req.body);
    const scheduleError = validateTaskSchedule(taskData);
    if (scheduleError) {
      return res.status(400).json({ message: scheduleError });
    }

    const busyTask = await findBusyTaskForMechanic(taskData.assignedTo);
    if (busyTask) {
      return res.status(409).json({
        message:
          "Selected mechanic is busy with a Pending, Ongoing, or Returned task.",
      });
    }

    const task = new TaskModel(taskData);
    await task.save();
    await syncMaintenanceLogFromTask(task);
    try {
      await createTaskNotifications({ task });
    } catch (notifyErr) {
      console.error("Task notification failed:", notifyErr);
    }
    publishTypedEvent("task:updated", {
      taskId: String(task._id),
      updatedAt: task.updatedAt || task.createdAt,
      status: task.status,
    });
    const audit = withActorId(req, `Task created: ${task.id || task._id}`);
    await auditLog(audit.action, audit.actorId);
    res.status(201).json({ status: "Ok", data: serializeTask(task) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getTasks = async (req, res) => {
  try {
    const tasks = await TaskModel.find({});
    res.status(200).json({
      status: "Ok",
      data: tasks.map((task) => serializeTask(task)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getTaskById = async (req, res) => {
  try {
    const task = await TaskModel.findOne({ id: req.params.id });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    const audit = withActorId(req, `Task updated: ${task.id || task._id}`);
    await auditLog(audit.action, audit.actorId);
    res.status(200).json({ status: "Ok", data: serializeTask(task) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateTask = async (req, res) => {
  try {
    const existingTask = await TaskModel.findOne({ id: req.params.id });
    if (!existingTask) {
      return res.status(404).json({ message: "Task not found" });
    }
    const previousTaskSnapshot = existingTask.toObject();

    const nextTask = prepareTaskUpdate(existingTask, req.body);
    const scheduleError = validateTaskSchedule(nextTask);
    if (scheduleError) {
      return res.status(400).json({ message: scheduleError });
    }

    existingTask.set(buildWritableTaskUpdate(nextTask));
    await existingTask.save();

    await TaskModel.updateOne(
      { id: req.params.id },
      { $unset: { assignedMechanic: 1 } },
    );

    const refreshedTask = await TaskModel.findOne({ id: req.params.id });
    await syncMaintenanceLogFromTask(refreshedTask);
    try {
      await createTaskNotifications({
        previousTask: previousTaskSnapshot,
        task: refreshedTask,
      });
    } catch (notifyErr) {
      console.error("Task notification failed:", notifyErr);
    }
    publishTypedEvent("task:updated", {
      taskId: String(refreshedTask._id),
      updatedAt: refreshedTask.updatedAt || refreshedTask.createdAt,
      status: refreshedTask.status,
    });

    res.status(200).json({
      status: "Ok",
      data: serializeTask(refreshedTask),
    });
  } catch (err) {
    console.error("Task update failed:", err);
    res.status(500).json({ message: err.message });
  }
};

const cleanupAssignedMechanic = async (req, res) => {
  try {
    const result = await TaskModel.updateMany(
      { assignedMechanic: { $exists: true } },
      { $unset: { assignedMechanic: 1 } },
    );

    const audit = withActorId(
      req,
      `Task cleanup removed assignedMechanic from ${result.modifiedCount || 0} task(s)`,
    );
    await auditLog(audit.action, audit.actorId);

    res.status(200).json({
      status: "Ok",
      message: "Removed redundant assignedMechanic field from tasks",
      matchedCount: result.matchedCount || 0,
      modifiedCount: result.modifiedCount || 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteTask = async (req, res) => {
  try {
    const task = await TaskModel.findOneAndDelete(
      buildTaskIdentifierQuery(req.params.id),
    );
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    await removeMaintenanceLogForTask(task);
    publishTypedEvent("task:updated", {
      taskId: String(task._id),
      updatedAt: new Date().toISOString(),
      deleted: true,
    });
    const audit = withActorId(req, `Task deleted: ${task.id || task._id}`);
    await auditLog(audit.action, audit.actorId);
    res.status(200).json({ status: "Ok", message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getTaskSummary = async (req, res) => {
  try {
    const [count, latestTask] = await Promise.all([
      TaskModel.countDocuments({}),
      TaskModel.findOne({})
        .sort({ updatedAt: -1, createdAt: -1 })
        .select("updatedAt createdAt")
        .lean(),
    ]);

    res.status(200).json({
      count,
      latestUpdatedAt: latestTask?.updatedAt || latestTask?.createdAt || null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createTask,
  getTasks,
  getTaskSummary,
  getBaseMaintenanceAnalytics,
  getTaskById,
  updateTask,
  cleanupAssignedMechanic,
  deleteTask,
};
