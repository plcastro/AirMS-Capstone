const mongoose = require("mongoose");

const inspectionTaskSchema = new mongoose.Schema({

  inspectionName: {
    type: String,
    required: true
  },

  aircraftModel: {
    type: String,
    required: true
  },

  ata: {
    chapter: Number,
    chapterName: String,
    section: Number,
    sectionName: String
  },

  taskId: {
    type: String,
    required: true
  },

  taskName: {
    type: String,
    required: true
  },

  component: String,
  componentModel: String,

  inspectionType: String,
  inspectionTypeFull: String,

  documentation: String,
  description: String,
  correctiveAction: String,
  environmentalCondition: String,
  engineModel: String,

  conditions: {
    modificationStatus: String,
    modificationNumbers: [String],
    effectivity: [String]
  },

  interval: {
    flightHours: Number,
    calendarMonths: Number,
    specificInterval: String
  }

}, { collection: "inspection_tasks", timestamps: true });

module.exports = mongoose.model("InspectionTask", inspectionTaskSchema);