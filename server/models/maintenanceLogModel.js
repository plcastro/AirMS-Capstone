const mongoose = require("mongoose");
const maintenanceLogSchema = new mongoose.Schema({
  sourceTaskId: {
    type: String,
    default: "",
    index: true,
  },
  taskTitle: {
    type: String,
    default: "",
  },
  sourceTaskStatus: {
    type: String,
    default: "",
  },
  aircraft: {
    type: String,
    required: [true, "Please enter the aircraft model."],
  },
  defects: {
    type: String,
  },
  dateDefectDiscovered: { type: Date, default: Date.now, required: true },
  correctiveActionDone: {
    type: String,
  },
  workDetails: {
    type: [
      {
        description: {
          type: String,
          default: "",
        },
      },
    ],
    default: [],
  },
  workDetailsLocked: {
    type: Boolean,
    default: false,
  },

  dateDefectRectified: {
    type: Date,
  },
  reportedBy: {
    type: String,
    required: [true, "Please enter the name of the person reporting."],
  },
  status: {
    type: String,
    enum: ["verified", "unverified"],
    default: "unverified",
  },
}, { timestamps: true });

const MaintenanceLog = mongoose.model("maintenanceLogs", maintenanceLogSchema);
module.exports = MaintenanceLog;
