const mongoose = require("mongoose");

/**
 * Admin Activity Log Schema
 * Tracks all sensitive admin operations for audit and compliance
 */
const adminActivityLogSchema = new mongoose.Schema(
  {
    admin: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      username: { type: String, required: true },
      email: { type: String, required: true },
      accessLevel: {
        type: String,
        enum: ["Admin", "Superuser"],
        required: true,
      },
    },
    action: {
      type: String,
      enum: [
        "USER_CREATED",
        "USER_MODIFIED",
        "USER_DELETED",
        "USER_STATUS_CHANGED",
        "PASSWORD_RESET",
        "PIN_RESET",
        "ACCOUNT_LOCKED",
        "ACCOUNT_UNLOCKED",
        "PERMISSION_CHANGED",
        "ROLE_CHANGED",
        "ACCESS_LEVEL_CHANGED",
        "SESSION_TERMINATED",
        "SECURITY_SETTING_CHANGED",
        "LOGIN",
        "LOGOUT",
        "FAILED_LOGIN",
        "AUDIT_LOG_ACCESSED",
      ],
      required: true,
    },
    targetUser: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      username: String,
      email: String,
    },
    details: {
      description: String,
      previousValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed,
      changedFields: [String],
    },
    ipAddress: String,
    userAgent: String,
    endpoint: String,
    method: { type: String, enum: ["GET", "POST", "PUT", "DELETE", "PATCH"] },
    statusCode: Number,
    timestamp: { type: Date, default: Date.now },
    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
    },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILURE", "PENDING"],
      default: "SUCCESS",
    },
  },
  { timestamps: true },
);

// Index for fast queries
adminActivityLogSchema.index({ "admin.id": 1, timestamp: -1 });
adminActivityLogSchema.index({ action: 1, timestamp: -1 });
adminActivityLogSchema.index({ "targetUser.id": 1, timestamp: -1 });
adminActivityLogSchema.index({ timestamp: -1 });
adminActivityLogSchema.index({ severity: 1, timestamp: -1 });

module.exports = mongoose.model("AdminActivityLog", adminActivityLogSchema);
