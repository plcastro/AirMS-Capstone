const mongoose = require("mongoose");

/**
 * Admin Security Alert Schema
 * Tracks and stores critical security events that require immediate admin notification
 */
const adminSecurityAlertSchema = new mongoose.Schema(
  {
    alertType: {
      type: String,
      enum: [
        "MULTIPLE_FAILED_LOGINS",
        "ACCOUNT_LOCKED",
        "UNAUTHORIZED_ACCESS_ATTEMPT",
        "PRIVILEGE_ESCALATION_ATTEMPT",
        "UNUSUAL_ACTIVITY",
        "USER_CREATED",
        "ADMIN_MODIFIED",
        "PERMISSION_CHANGED",
        "PASSWORD_RESET",
        "ACCOUNT_DELETED",
        "BULK_OPERATION",
        "SECURITY_SETTING_CHANGED",
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ["INFO", "WARNING", "CRITICAL"],
      default: "WARNING",
    },
    title: String,
    description: String,

    // Related entities
    affectedUser: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      username: String,
      email: String,
    },
    triggeredBy: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      username: String,
      email: String,
    },

    // Context information
    details: {
      ipAddress: String,
      userAgent: String,
      location: String, // Can be derived from IP
      endpoint: String,
      method: String,
      failedAttempts: Number,
      previousValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed,
    },

    // Notification status
    notificationsSent: {
      type: Map,
      of: {
        method: { type: String, enum: ["email", "in-app", "sms"] },
        sentAt: Date,
        recipient: String,
        status: {
          type: String,
          enum: ["pending", "sent", "failed"],
          default: "pending",
        },
      },
    },

    // Alert actions
    acknowledged: { type: Boolean, default: false },
    acknowledgedBy: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      username: String,
      acknowledgedAt: Date,
    },
    actionTaken: {
      type: String,
      enum: ["none", "investigated", "resolved", "dismissed"],
      default: "none",
    },
    actionNotes: String,

    // Auto-resolution
    autoResolved: { type: Boolean, default: false },
    resolutionTime: Number, // milliseconds

    createdAt: { type: Date, default: Date.now },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }, // 30 days
  },
  { timestamps: true },
);

// Index for fast queries
adminSecurityAlertSchema.index({ alertType: 1, createdAt: -1 });
adminSecurityAlertSchema.index({ severity: 1, createdAt: -1 });
adminSecurityAlertSchema.index({ "affectedUser.id": 1, createdAt: -1 });
adminSecurityAlertSchema.index({ acknowledged: 1, createdAt: -1 });
adminSecurityAlertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

module.exports = mongoose.model("AdminSecurityAlert", adminSecurityAlertSchema);
