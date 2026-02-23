const mongoose = require("mongoose");
const validator = require("validator");
mongoose.sanitizeFilter = true;

const aircraftSchema = new mongoose.Schema({
  tailNum: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  type: {
    type: String,
    required: true,
    trim: true,
  },
  base: {
    type: String,
    required: true,
    trim: true,
  },
  engines: {
    type: [
      {
        id: { type: String, required: true },
        type: { type: String, required: true },
        cycles: { type: Number, default: 0 },
        time: { type: Number, default: 0 },
      },
    ],
    required: true,
  },
  apu: {
    type: {
      cycles: { type: Number, default: 0 },
      time: { type: Number, default: 0 },
    },
    required: true,
  },
  airFameTime: {
    type: Number,
    default: 0,
  },
  airFrameCycles: {
    type: Number,
    default: 0,
  },
  notes: {
    type: String,
    trim: true,
  },
});

const Aircraft = mongoose.model("aircraft", aircraftSchema);

module.exports = Aircraft;
