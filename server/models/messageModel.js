const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      index: true,
    },
    body: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    attachments: [
      {
        url: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
          trim: true,
          maxlength: 180,
        },
        mimeType: {
          type: String,
          trim: true,
          maxlength: 120,
        },
        size: {
          type: Number,
          default: 0,
        },
        kind: {
          type: String,
          enum: ["image", "file"],
          default: "file",
        },
      },
    ],
    readAt: {
      type: Date,
      default: null,
      index: true,
    },
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true },
);

messageSchema.pre("validate", function validateMessageTarget() {
  if (!this.recipient && !this.conversation) {
    throw new Error("Message requires a recipient or conversation");
  }

  if (!String(this.body || "").trim() && (!this.attachments || this.attachments.length === 0)) {
    throw new Error("Message requires text or an attachment");
  }
});

messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, sender: 1, createdAt: -1 });
messageSchema.index({ conversation: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);
