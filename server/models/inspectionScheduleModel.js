const mongoose = require("mongoose");

const inspectionScheduleSchema = new mongoose.Schema({
    tailNumber: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },

  aircraftModel: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },

  inspectionName: {
    type: String,
    required: true,
    trim: true
  },

  interval: {
    flightHours: { type: Number, required: true },
    calendarMonths: { type: Number, required: true },
    description: { type: String, required: true }
  },

  msmReference: {
    type: String,
    required: true,
    trim: true
  },

  documentId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  issueDate: {
    type: Date,
    required: true
  },

  metadata: {
    language: String,
    source: String,
    documentType: String,
    extractionDate: Date
  }

}, { collection: "inspection_schedules", timestamps: true });

module.exports = mongoose.model("InspectionSchedule", inspectionScheduleSchema);