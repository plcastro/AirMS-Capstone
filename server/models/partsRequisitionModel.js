const mongoose = require("mongoose");

const RequisitionItemSchema = new mongoose.Schema({
  itemNo: { type: Number, required: true },
  matCodeNo: { type: String, required: true },
  particular: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitOfMeasure: { type: String, required: true },
  purpose: { type: String },
});

const PartsRequisitionSchema = new mongoose.Schema(
  {
    wrsNo: {
      type: String,
      required: true,
      unique: true,
    },
    aircraft: { type: String, required: true },
    staff: {
      requisitioner: { type: String, required: true },
      approvedBy: { type: String, required: true },
      receiver: { type: String, required: true },
      notedBy: { type: String, required: true },
    },
    items: [RequisitionItemSchema],
    dateRequested: { type: Date, required: true },
    dateApproved: { type: Date },
    dateReceived: { type: Date },
    status: {
      type: String,
      enum: ["Pending", "Approved", "In Progress", "Completed", "Rejected", "Cancelled"],
      default: "Pending",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PartsRequisition", PartsRequisitionSchema);
