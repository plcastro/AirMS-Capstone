const mongoose = require("mongoose");
const validator = require("validator");

const approveTechnicalLogSchema = new mongoose.Schema(
  {
    station: {
      type: String,
      required: true,
    },
    frequency: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },

    // MMEL entries (fixed length of 6)
    mmel: {
      type: [String],
      validate: {
        validator: (arr) => arr.length === 6,
        message: "MMEL must contain exactly 6 entries",
      },
      default: Array(6).fill(""),
    },

    vor1: {
      type: String,
    },
    vor2: {
      type: String,
    },
    dueNext: {
      type: String, // kept string to match frontend formatting
    },

    signature: {
      type: String,
      required: true,
    },

    preFlightDate: {
      type: Date,
      required: true,
    },

    ap: {
      type: String, // Approving Person / Authorization
      required: true,
    },

    // Optional workflow metadata
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
    approvedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "approveTechnicalLogs",
  approveTechnicalLogSchema,
);
