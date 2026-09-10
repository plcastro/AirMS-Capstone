// models/partsMonitoring.js
const mongoose = require("mongoose");

const partsMonitoringSchema = new mongoose.Schema(
  {
    aircraft: {
      type: String,
      required: true,
      unique: true,
    },
    dateManufactured: {
      type: Date,
    },
    aircraftType: {
      type: String,
      required: true,
    },
    creepDamage: {
      type: String,
    },
    referenceData: {
      today: { type: Date, default: Date.now },
      acftTT: { type: Number, default: undefined },
      engTT: { type: Number, default: undefined },
      n1Cycles: { type: Number, default: undefined },
      n2Cycles: { type: Number, default: undefined },
      landings: { type: Number, default: undefined },
      gbmTT: { type: Number, default: undefined },
      gbmTSO: { type: Number, default: undefined },
      gbtTT: { type: Number, default: undefined },
      gbtTSO: { type: Number, default: undefined },
      gbt42TT: { type: Number, default: undefined },
      gbt42TSO: { type: Number, default: undefined },
      mrbTT: { type: Number, default: undefined },
      trbTT: { type: Number, default: undefined },
      eng1TT: { type: Number, default: undefined },
      eng1TSO: { type: Number, default: undefined },
      eng1Cycles: { type: Number, default: undefined },
      eng2TT: { type: Number, default: undefined },
      eng2TSO: { type: Number, default: undefined },
      eng2Cycles: { type: Number, default: undefined },
      usage: { type: Number, default: undefined },
      others: { type: Number, default: undefined },
      acrfNextInsp: { type: String, default: undefined },
      engNextInsp: { type: String, default: undefined },
      referenceCells: { type: mongoose.Schema.Types.Mixed, default: undefined },
    },
    parts: [
      {
        _id: { type: String, required: true },
        rowType: { type: String, enum: ["part", "header"], default: "part" },
        // Make componentName not required for header rows by using a custom validator
        componentName: {
          type: String,
          validate: {
            validator: function (v) {
              // If it's a header row, componentName can be empty
              if (this.rowType === "header") return true;
              // For part rows, componentName is required
              return v && v.trim().length > 0;
            },
            message: "Component name is required for part rows",
          },
        },
        hourLimit1: { type: String, default: "" },
        hourLimit2: { type: String, default: "" },
        hourLimit3: { type: String, default: "" },
        dayLimit: { type: String, default: "" },
        dayType: { type: String, default: "" },
        dateCW: { type: String, default: "" },
        hoursCW: { type: String, default: "" },
        daysRemaining: { type: String, default: "" },
        timeRemaining: { type: String, default: "" },
        dateDue: { type: String, default: "" },
        ttCycleDue: { type: String, default: "" },
        due: { type: String, default: "" },
        hd: { type: String, default: "" },
        timeSinceInstall: { type: String, default: "" },
        totalTimeSinceNew: { type: String, default: "" },
        formulas: { type: mongoose.Schema.Types.Mixed, default: undefined },
      },
    ],
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    updatedBy: {
      type: String,
      default: "system",
    },
  },
  {
    // Allow saving even if some validations fail
    strict: false,
  },
);

// Index for faster queries
partsMonitoringSchema.index({ lastUpdated: -1 });

module.exports = mongoose.model(
  "PartsLifespanMonitoring",
  partsMonitoringSchema,
);
