const mongoose = require("mongoose");

const defectDetailsSchema = new mongoose.Schema(
  {
    defectType: { type: String, default: "" },
    symptom: { type: String, default: "" },
    affectedComponent: { type: String, default: "" },
    maintenanceMeaning: { type: String, default: "" },
    confidence: { type: String, default: "low" },
  },
  { _id: false },
);

const aiInsightCacheSchema = new mongoose.Schema(
  {
    cacheKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    aircraftId: {
      type: String,
      required: true,
      index: true,
    },
    aircraft: {
      type: String,
      default: "",
      index: true,
    },
    issueTitle: {
      type: String,
      default: "",
    },
    evidenceSignature: {
      type: String,
      required: true,
      index: true,
    },
    matchedRuleCodes: {
      type: [String],
      default: [],
    },
    managerSummary: {
      type: String,
      default: "",
    },
    recommendedAction: {
      type: String,
      default: "",
    },
    recommendedActions: {
      type: [String],
      default: [],
    },
    manualReferences: {
      type: [String],
      default: [],
    },
    procedureReference: {
      type: String,
      default: "",
    },
    procedureTitle: {
      type: String,
      default: "",
    },
    procedureSummary: {
      type: String,
      default: "",
    },
    defectDetails: {
      type: defectDetailsSchema,
      default: null,
    },
    defectDetailsSource: {
      type: String,
      default: "none",
    },
    model: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

const AiInsightCache = mongoose.model("aiInsightCaches", aiInsightCacheSchema);

module.exports = AiInsightCache;
