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

  pilotInCommand: {
    type: String,
    required: true,
    trim: true,
  },

  secondPilotInCommand: {
    type: String,
    trim: true,
  },

  date: {
    type: String,
    trim: true,
  },

  dateZulu: {
    type: String,
    trim: true,
  },

  depart: {
    type: String,
    required: true,
    trim: true,
  },

  arrive: {
    type: String,
    required: true,
    trim: true,
  },

  departure: {
    type: String,
    trim: true,
  },

  offBlock: {
    type: String,
    trim: true,
  },

  onBlock: {
    type: String,
    trim: true,
  },

  blockTime: {
    type: Number,
    default: 0,
  },

  flightTime: {
    type: Number,
    default: 0,
  },

  cycles: {
    type: Number,
    default: 0,
  },

  nightFlightSpecific: {
    type: Number,
    default: 0,
  },

  nLdgFlightSpecific: {
    type: Number,
    default: 0,
  },

  appFlightSpecific: {
    type: Number,
    default: 0,
  },

  instFlightSpecific: {
    type: Number,
    default: 0,
  },

  pilotFlightSpecific: {
    type: String,
    trim: true,
  },

  engine1TForward: {
    type: Number,
    default: 0,
  },

  engine2TForward: {
    type: Number,
    default: 0,
  },

  apliTForward: {
    type: Number,
    default: 0,
  },

  engine1CTimes: {
    type: Number,
    default: 0,
  },

  engine2CTimes: {
    type: Number,
    default: 0,
  },

  apliTCTimes: {
    type: Number,
    default: 0,
  },

  totalsThisFlightLog: {
    type: Number,
    default: 0,
  },

  totalsThisFlightLog1: {
    type: Number,
    default: 0,
  },

  totalsThisFlightLog2: {
    type: Number,
    default: 0,
  },

  airframeForward: {
    type: Number,
    default: 0,
  },

  airframeForward1: {
    type: Number,
    default: 0,
  },

  airframeForward2: {
    type: Number,
    default: 0,
  },

  airframeTotalTime: {
    type: Number,
    default: 0,
  },

  airframeTotalTime1: {
    type: Number,
    default: 0,
  },

  airframeTotalTime2: {
    type: Number,
    default: 0,
  },

  engine1CycPWD: {
    type: Number,
    default: 0,
  },

  engine2CycPWD: {
    type: Number,
    default: 0,
  },

  engine1Cycles: {
    type: Number,
    default: 0,
  },

  engine2Cycles: {
    type: Number,
    default: 0,
  },

  pax: {
    type: Number,
    default: 0,
  },

  fuelPurchased: {
    type: Number,
    default: 0,
  },

  fuelOut: {
    type: Number,
    default: 0,
  },

  fuelIn: {
    type: Number,
    default: 0,
  },

  fuelBurn: {
    type: Number,
    default: 0,
  },

  legDistance: {
    type: Number,
    default: 0,
  },

  fboHandler: {
    type: String,
    trim: true,
  },
},
{
  timestamps: true,
});

const TechnicalLog = mongoose.model("TechnicalLog", technicalLogSchema);

module.exports = TechnicalLog;
