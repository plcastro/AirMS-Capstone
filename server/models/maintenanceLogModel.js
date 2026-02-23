const mongoose = require("mongoose");
const validator = require("validator");
const maintenanceLogSchema = new mongoose.Schema({
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
});

const MaintenanceLog = mongoose.model("maintenanceLogs", maintenanceLogSchema);
module.exports = MaintenanceLog;
