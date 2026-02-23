const mongoose = require("mongoose");
const validator = require("validator");

const technicalLogSchema = new mongoose.Schema(
  {
    tailNum: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    pilotInCommand: { type: String, required: true, trim: true },
    secondPilotInCommand: { type: String, trim: true },
    depart: { type: String, required: true, trim: true },
    arrive: { type: String, required: true, trim: true },
    offBlockUtc: { type: Date, required: true },
    onBlockUtc: { type: Date, required: true },
    approaches: { type: Number, default: 0 },
    pilotRole: { type: String, trim: true },
    pax: { type: Number, default: 0 },
    fuelPurchased: { type: Number, default: 0 },
    fuelOut: { type: Number, default: 0 },
    fuelIn: { type: Number, default: 0 },
    fboHandler: { type: String, trim: true },

    computed: {
      blockTime: { type: Number, default: 0 },
      flightTime: { type: Number, default: 0 },
      cycles: { type: Number, default: 0 },
      nightTime: { type: Number, default: 0 },
      nightLandings: { type: Number, default: 0 },
      instrumentTime: { type: Number, default: 0 },
      fuelBurn: { type: Number, default: 0 },
      legDistance: { type: Number, default: 0 },
    },

    maintenance: {
      engine1TimeBefore: { type: Number, default: 0 },
      engine2TimeBefore: { type: Number, default: 0 },
      apuTimeBefore: { type: Number, default: 0 },
      airframeTimeBefore: { type: Number, default: 0 },
      engine1CyclesBefore: { type: Number, default: 0 },
      engine2CyclesBefore: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  },
);

const TechnicalLog = mongoose.model("TechnicalLog", technicalLogSchema);

module.exports = TechnicalLog;
