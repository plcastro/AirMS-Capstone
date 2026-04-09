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

const createTask = async (req, res) => {
  try {
    const task = new TaskModel(req.body);
    await task.save();
    const audit = withActorId(req, `Task created: ${task.id || task._id}`);
    await auditLog(audit.action, audit.actorId);
    res.status(201).json({ status: "Ok", data: task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getTasks = async (req, res) => {
  try {
    const tasks = await TaskModel.find({});
    res.status(200).json({ status: "Ok", data: tasks });
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
    res.status(200).json({ status: "Ok", data: task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateTask = async (req, res) => {
  try {
    const task = await TaskModel.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { returnDocument: "after" },
    );
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.status(200).json({ status: "Ok", data: task });
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
  deleteTask,
};
