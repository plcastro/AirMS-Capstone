const mongoose = require("mongoose");

const maintenancePriorityRuleSchema = new mongoose.Schema(
  {
    profile: {
      type: String,
      required: true,
      unique: true,
      default: "default",
    },
    criticalDueDays: {
      type: Number,
      default: 5,
      min: 0,
    },
    criticalRemainingHours: {
      type: Number,
      default: 14,
      min: 0,
    },
    highDueDays: {
      type: Number,
      default: 7,
      min: 0,
    },
    highRemainingHours: {
      type: Number,
      default: 24,
      min: 0,
    },
    mediumDueDays: {
      type: Number,
      default: 14,
      min: 0,
    },
    longTurnaroundHours: {
      type: Number,
      default: 5,
      min: 0,
    },
    safetyBoostEnabled: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: String,
      default: "system",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model(
  "MaintenancePriorityRule",
  maintenancePriorityRuleSchema,
);
