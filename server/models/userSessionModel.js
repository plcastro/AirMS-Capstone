const mongoose = require("mongoose");

const userSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sessionId: { type: String, required: true, unique: true, index: true },
    platform: {
      type: String,
      enum: ["WEB", "MOBILE", "UNKNOWN"],
      default: "UNKNOWN",
    },
    base: {
      type: String,
      enum: ["MANILA", "CEBU", "CDO", "UNKNOWN"],
      default: "UNKNOWN",
    },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    loginAt: { type: Date, default: Date.now },
    lastActivityAt: { type: Date, default: Date.now },
    logoutAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("UserSession", userSessionSchema);
