const mongoose = require("mongoose");
const { publishTypedEvent } = require("../utils/realtimeEvents");

const NotificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    module: {
      type: String,
      enum: [
        "parts-requisition",
        "flight-logs",
        "pre-inspections",
        "post-inspections",
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
        "pre-inspection",
        "post-inspection",
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

NotificationSchema.post("save", function onNotificationSaved(doc) {
  publishTypedEvent("notification:new", {
    notificationId: String(doc._id),
    module: doc.module,
    entityType: doc.entityType,
    entityId: doc.entityId ? String(doc.entityId) : null,
    createdAt: doc.createdAt,
  });
});

module.exports = mongoose.model("Notification", NotificationSchema);
