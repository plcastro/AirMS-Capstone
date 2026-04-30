const mongoose = require("mongoose");

const manualProcedureSchema = new mongoose.Schema(
  {
    reference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    title: { type: String, default: "" },
    sourceFile: { type: String, default: "" },
    notices: { type: [String], default: [] },
    jobSetupActions: { type: [String], default: [] },
    procedureActions: { type: [String], default: [] },
    closeUpActions: { type: [String], default: [] },
    criteria: { type: [String], default: [] },
    exactSteps: { type: [String], default: [] },
    active: { type: Boolean, default: true },
    updatedBy: { type: String, default: "system" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ManualProcedure", manualProcedureSchema);
