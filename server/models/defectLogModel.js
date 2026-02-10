const mongoose = require("mongoose");
const validator = require("validator");

const defectLogSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now, required: true },
  reportedBy: {
    type: String,
    required: [true, "Please enter the name of the person reporting."],
  },
  aircraft_model: {
    type: String,
    required: [true, "Please enter the aircraft model."],
  },
  description: { type: String },
});

const DefectLog = mongoose.model("defectLogs", defectLogSchema);
module.exports = DefectLog;
