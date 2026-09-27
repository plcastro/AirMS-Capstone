const mongoose = require("mongoose");

const REQUISITION_STATUSES = ["Requested", "Awaiting Stock", "Ready for Delivery", "Delivered", "Closed", "Cancelled"];
const ITEM_STATUSES = ["Pending Check", "In Stock", "Out of Stock"];

const RequisitionMatcodeParticular = new mongoose.Schema({
  matCodeNo: { type: String, required: true },
  particular: { type: String, required: true },
})

const RequisitionItemSchema = new mongoose.Schema({
  itemNo: { type: Number, required: true },
  codeParticular: { type: [RequisitionMatcodeParticular], default: [] },
  // matCodeNo: { type: String, required: true },
  particular: { type: String, default: "" },
  quantity: { type: Number, required: true },
  unitOfMeasure: { type: String, required: true },
  purpose: { type: String, default: "" },
  availableQty: { type: Number },
  stockStatus: {
    type: String,
    enum: ITEM_STATUSES,
    default: "Pending Check",
  },
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
      requisitionerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      requisitionerTitle: { type: String, default: "" },
      approvedBy: { type: String, default: "" },
      approvedByTitle: { type: String, default: "" },
      receiver: { type: String, default: "" },
      receiverTitle: { type: String, default: "" },
      notedBy: { type: String, default: "" },
      notedByTitle: { type: String, default: "" },
      warehouseBy: { type: String, default: "" },
      warehouseByTitle: { type: String, default: "" },
      deliveredBy: { type: String, default: "" },
      deliveredByTitle: { type: String, default: "" },
    },
    items: { type: [RequisitionItemSchema], default: [] },
    workflowVersion: { type: Number },
    deliveredAt: Date,
    deliveredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    confirmedAt: Date,
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    cancelledAt: Date,
    history: [{ at: Date, label: String, actorId: String, actorName: String, details: String }],
    dateRequested: { type: Date, required: true },
    dateApproved: { type: Date },
    dateReceived: { type: Date },
    dateWarehouseReviewed: { type: Date },
    dateOrdered: { type: Date },
    dateDelivered: { type: Date },
    dateCancelled: { type: Date },
    status: {
      type: String,
      enum: REQUISITION_STATUSES,
      default: "Requested",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PartsRequisition", PartsRequisitionSchema);
