const mongoose = require("mongoose");
const { publishTypedForUsers } = require("../utils/realtimeEvents");
const {
  resolveNotificationRecipientUserIds,
} = require("../utils/notificationRecipients");

const NotificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    module: {
      type: String,
      enum: [
        "parts-requisition",
        "flight-logs",
        "pre-flight inspections",
        "post-flight inspections",
        "tasks",
        "messages",
      ],
      default: "parts-requisition",
    },
    entityType: {
      type: String,
      enum: [
        "parts-requisition",
        "flight-log",
        "pre-flight inspection",
        "post-flight inspection",
        "task",
        "message",
      ],
      default: "parts-requisition",
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    recipientRoles: { type: [String], default: [] },
    recipientUsers: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    excludedUsers: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    readBy: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    clearedBy: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

NotificationSchema.index({ module: 1, createdAt: -1 });
NotificationSchema.index({ recipientRoles: 1, createdAt: -1 });
NotificationSchema.index({ recipientUsers: 1, createdAt: -1 });
NotificationSchema.index({ excludedUsers: 1, createdAt: -1 });

NotificationSchema.post("save", function onNotificationSaved(doc) {
  resolveNotificationRecipientUserIds({
    recipientUsers: doc.recipientUsers,
    recipientRoles: doc.recipientRoles,
    excludedUsers: doc.excludedUsers,
  })
    .then((recipientUserIds) => {
      publishTypedForUsers(recipientUserIds, "notification:new", {
        notificationId: String(doc._id),
        module: doc.module,
        entityType: doc.entityType,
        entityId: doc.entityId ? String(doc.entityId) : null,
        createdAt: doc.createdAt,
      });
    })
    .catch((error) => {
      console.error("Failed to publish notification event:", error);
    });
});

module.exports = mongoose.model("Notification", NotificationSchema);
