const mongoose = require("mongoose");
const validator = require("validator");

const userLogSchema = new mongoose.Schema({
  dateTime: { type: Date, default: Date.now },
  action: { type: String, required: true },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: false,
  },
  username: { type: String, required: false },
  sessionId: { type: String, default: null },
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
});

const UserLog = mongoose.model("userLogs", userLogSchema);
module.exports = UserLog;
