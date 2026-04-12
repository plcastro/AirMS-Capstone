const mongoose = require("mongoose");

const REQUISITION_STATUSES = [
  "Pending",
  "Approved",
  "In Progress",
  "Completed",
  "Rejected",
  "Cancelled",
  "Parts Requested",
  "Availability Checked",
  "To Be Ordered",
  "Ordered",
  "Delivered",
];

const ITEM_STATUSES = [
  "Parts Requested",
  "In Stock",
  "Out of Stock",
  "To Be Ordered",
  "Ordered",
  "Approved",
  "Delivered",
  "Cancelled",
];

const RequisitionItemSchema = new mongoose.Schema({
  itemNo: { type: Number, required: true },
  matCodeNo: { type: String, required: true },
  particular: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitOfMeasure: { type: String, required: true },
  purpose: { type: String, default: "" },
  availableQty: { type: Number, default: 0 },
  stockStatus: {
    type: String,
    enum: ITEM_STATUSES,
    default: "Parts Requested",
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
      approvedBy: { type: String, default: "" },
      receiver: { type: String, default: "" },
      notedBy: { type: String, default: "" },
      warehouseBy: { type: String, default: "" },
      deliveredBy: { type: String, default: "" },
    },
    items: { type: [RequisitionItemSchema], default: [] },
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
      default: "Parts Requested",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PartsRequisition", PartsRequisitionSchema);
