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
  username: { type: String, required: false }, // snapshot at action time
});

const UserLog = mongoose.model("userLogs", userLogSchema);
module.exports = UserLog;
