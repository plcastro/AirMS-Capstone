const mongoose = require("mongoose");
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
    default: "",
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
    default: "Pending",
  },

  priority: {
    type: String,
    default: "Normal",
  },

  maintenanceType: {
    type: String,
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
    type: [
      {
        taskId: { type: String, required: true },
        taskName: { type: String, required: true },
        inspectionTypeFull: { type: String, default: "" },

        inspectionName: { type: String, default: "" },
        aircraftModel: { type: String, default: "" },
        ata: {
          chapter: { type: Number, default: 0 },
          chapterName: { type: String, default: "" },
          section: { type: Number, default: 0 },
          sectionName: { type: String, default: "" },
        },
        component: { type: String, default: "" },
        componentModel: { type: String, default: "" },
        inspectionType: { type: String, default: "" },
        documentation: { type: String, default: "" },
        description: { type: String, default: "" },
        correctiveAction: { type: String, default: "" },
        environmentalCondition: { type: String, default: "" },
        engineModel: { type: String, default: "" },
        conditions: {
          modificationStatus: { type: String, default: "" },
          modificationNumbers: { type: [String], default: [] },
          effectivity: { type: [String], default: [] },
        },
        interval: {
          flightHours: { type: Number, default: 0 },
          calendarMonths: { type: Number, default: 0 },
          specificInterval: { type: String, default: "" },
        },
        
        tailNumber: { type: String, default: "" },
      },
    ],
    default: [],
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

module.exports = mongoose.model("task", taskSchema);
