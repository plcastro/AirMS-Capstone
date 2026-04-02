const mongoose = require("mongoose");

const RequisitionItemSchema = new mongoose.Schema({
  itemNo: { type: Number, required: true },
  matCodeNo: { type: String, required: true },
  particular: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitOfMeasure: { type: String, required: true },
  purpose: { type: String, required: true },
});

const PartsRequisitionSchema = new mongoose.Schema(
  {
    wrsNo: {
      type: String,
      required: true,
      unique: true,
    },
    aircraft: { type: String, required: true },
    status: {
      type: String,
      enum: ["Pending", "Approved", "In Progress", "Completed", "Cancelled"],
      default: "Pending",
    },
    slocNameCode: { type: String, required: true },
    dateRequested: { type: String, required: true },
    dateReceived: { type: String },
    staff: {
      employeeName: { type: String, required: true },
      cchead: { type: String, required: true },
      enduser: { type: String, required: true },
      notedby: { type: String, required: true },
    },

    items: [RequisitionItemSchema],
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("PartsRequisition", PartsRequisitionSchema);
