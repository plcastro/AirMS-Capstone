const TaskModel = require("../models/taskModel");
const { auditLog } = require("./logsController");
const getAuditActorId = (req, fallbackId = null) => req.user?.id || fallbackId;
const withActorId = (req, action, fallbackId = null) => {
  const actorId = getAuditActorId(req, fallbackId);
  return {
    actorId,
    action: actorId ? `${action} (actorId: ${actorId})` : action,
  };
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

  nextTask.completedAt = normalizeDateInput(
    sanitizedPayload.completedAt,
    existingTask?.completedAt,
  );
  nextTask.reviewedAt = normalizeDateInput(
    sanitizedPayload.reviewedAt,
    existingTask?.reviewedAt,
  );
  nextTask.returnedAt = normalizeDateInput(
    sanitizedPayload.returnedAt,
    sanitizedPayload.returnedDate,
    existingTask?.returnedAt,
    existingTask?.returnedDate,
  );
  nextTask.approvedAt = normalizeDateInput(
    sanitizedPayload.approvedAt,
    sanitizedPayload.approvedDate,
    existingTask?.approvedAt,
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

const createTask = async (req, res) => {
  try {
    const taskData = prepareTaskUpdate(null, req.body);
    const task = new TaskModel(taskData);
    await task.save();
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

    const nextTask = prepareTaskUpdate(existingTask, req.body);
    existingTask.set(buildWritableTaskUpdate(nextTask));
    await existingTask.save();

    await TaskModel.updateOne(
      { id: req.params.id },
      { $unset: { assignedMechanic: 1 } },
    );

    const refreshedTask = await TaskModel.findOne({ id: req.params.id });
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
    const task = await TaskModel.findOneAndDelete({ id: req.params.id });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    const audit = withActorId(req, `Task deleted: ${task.id || task._id}`);
    await auditLog(audit.action, audit.actorId);
    res.status(200).json({ status: "Ok", message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  cleanupAssignedMechanic,
  deleteTask,
};
