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

  defects: {
    type: String,
    default: "",
  },

  correctiveActionDone: {
    type: String,
    default: "",
  },

  completionNotes: {
    type: String,
    default: "",
  },

  dateDiscovered: {
    type: Date,
    default: Date.now,
  },

  dateRectified: {
    type: Date,
    default: null,
  },

  completedAt: {
    type: Date,
    default: null,
  },

  reviewedAt: {
    type: Date,
    default: null,
  },

  returnedAt: {
    type: Date,
    default: null,
  },

  approvedAt: {
    type: Date,
    default: null,
  },

  isApproved: {
    type: Boolean,
    default: false,
  },

  approvedBy: {
    type: String,
    default: "",
  },

  returnedBy: {
    type: String,
    default: "",
  },

  returnComments: {
    type: String,
    default: "",
  },

  date: {
    type: Date,
    default: Date.now,
  },

  maintenanceHistory: {
    defectDiscoveredAt: {
      type: Date,
      default: null,
    },
    defectRectifiedAt: {
      type: Date,
      default: null,
    },
    sameDayRepair: {
      type: Boolean,
      default: false,
    },
    historyNotes: {
      type: String,
      default: "",
    },
  },

  performance: {
    estimatedHours: {
      type: Number,
      default: 0,
    },
    actualHours: {
      type: Number,
      default: 0,
    },
    turnaroundHours: {
      type: Number,
      default: 0,
    },
    downtimeHours: {
      type: Number,
      default: 0,
    },
    delayReason: {
      type: String,
      default: "",
    },
    completedWithinSchedule: {
      type: Boolean,
      default: false,
    },
  },

  summary: {
    category: {
      type: String,
      default: "",
    },
    severity: {
      type: String,
      default: "",
    },
    result: {
      type: String,
      default: "",
    },
    remarks: {
      type: String,
      default: "",
    },
  },
}, { timestamps: true });

module.exports = mongoose.model("task", taskSchema);
