const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    module: {
      type: String,
      enum: ["parts-requisition"],
      default: "parts-requisition",
    },
    entityType: {
      type: String,
      enum: ["parts-requisition"],
      default: "parts-requisition",
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "PartsRequisition",
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
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

NotificationSchema.index({ module: 1, createdAt: -1 });
NotificationSchema.index({ recipientRoles: 1, createdAt: -1 });
NotificationSchema.index({ recipientUsers: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", NotificationSchema);
