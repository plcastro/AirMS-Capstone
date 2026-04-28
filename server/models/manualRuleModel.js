const mongoose = require("mongoose");

const ruleConditionSchema = new mongoose.Schema(
  {
    fact: { type: String, required: true, trim: true },
    operator: {
      type: String,
      enum: ["==", "!=", ">", ">=", "<", "<=", "includes"],
      required: true,
    },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

const manualRuleSchema = new mongoose.Schema(
  {
    ruleCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: { type: String, default: "" },
    conditions: { type: [ruleConditionSchema], default: [] },
    riskLevel: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      required: true,
    },
    possibleIssue: { type: String, default: "" },
    component: { type: String, default: "" },
    recommendedActions: { type: [String], default: [] },
    explanationTemplate: { type: String, default: "" },
    manualReference: { type: String, default: "" },
    isStarterRule: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    updatedBy: { type: String, default: "system" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ManualRule", manualRuleSchema);
