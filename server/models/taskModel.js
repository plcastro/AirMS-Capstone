const mongoose = require("mongoose");
const validator = require("validator");
mongoose.sanitizeFilter = true;


const taskSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
  },
  aircraft: {
    type: String,
    required: true,
  },
  dueDate: {
    type: String,
    required: true,
  },
  startDateTime: {
    type: String,
    required: true,
  },
  endDateTime: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
    default: "Pending",
  },
  priority: {
    type: String,
    required: true,
    default: "Normal",
  },
  maintenanceType: {
    type: String,
    required: true,
    default: "Corrective Maintenance",
  },
  assignedTo: {
    type: String,
    required: true,
  },
  assignedToName: {
    type: String,
    required: true,
  },
  checklistItems: {
    type: [String],
    required: true,
    default: ["New checklist item"],
  },
  checklistState: {
    type: [Boolean],
    default: [],
  },
  findings: {
    type: String,
    default: "",
  },
});

const Task = mongoose.model("task", taskSchema);

module.exports = Task;