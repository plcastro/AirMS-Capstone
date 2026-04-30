const mongoose = require("mongoose");

const aiRectificationSchema = new mongoose.Schema(
  {
    aircraft: {
      type: String,
      required: true,
      index: true,
    },
    issueTitle: {
      type: String,
      default: "",
    },
    component: {
      type: String,
      default: "",
    },
    riskLevel: {
      type: String,
      default: "",
    },
    matchedRuleCodes: {
      type: [String],
      default: [],
    },
    rectifiedAt: {
      type: Date,
      default: Date.now,
    },
    rectifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "reopened"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true },
);

const AiRectification = mongoose.model(
  "aiRectifications",
  aiRectificationSchema,
);

module.exports = AiRectification;
