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
      enum: ["WEB", "MOBILE"],
      default: null,
    },
    base: {
      type: String,
      enum: ["MANILA", "CEBU", "CDO"],
      default: null,
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

// Keep inactive session history for audit, then let MongoDB remove old records.
userSessionSchema.index(
  { logoutAt: 1 },
  {
    expireAfterSeconds: 365 * 24 * 60 * 60,
    partialFilterExpression: { isActive: false },
  },
);

module.exports = mongoose.model("UserSession", userSessionSchema);
