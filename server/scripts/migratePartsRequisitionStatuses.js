require("dotenv").config();

const mongoose = require("mongoose");
const PartsRequisition = require("../models/partsRequisitionModel");

const STATUS_MAP = {
  pending: "Parts Requested",
  "in progress": "Ordered",
  completed: "Delivered",
  rejected: "Cancelled",
};

const ITEM_STATUS_MAP = {
  pending: "Parts Requested",
  "in progress": "Ordered",
  completed: "Delivered",
  rejected: "Cancelled",
  "ready for pickup": "Ordered",
};

const VALID_REQUISITION_STATUSES = new Set([
  "Parts Requested",
  "Availability Checked",
  "To Be Ordered",
  "Ordered",
  "Approved",
  "Delivered",
  "Cancelled",
]);

const VALID_ITEM_STATUSES = new Set([
  "Parts Requested",
  "In Stock",
  "Out of Stock",
  "To Be Ordered",
  "Ordered",
  "Approved",
  "Delivered",
  "Cancelled",
]);

const normalizeByMap = (value, map) => {
  if (typeof value !== "string") return value;
  const key = value.trim().toLowerCase();
  return map[key] || value;
};

const normalizeRequisitionStatus = (doc) => {
  const mapped = normalizeByMap(doc.status, STATUS_MAP);
  const hasWarehouseReview = Boolean(doc.dateWarehouseReviewed);

  // Backfill the new workflow status for reviewed records that never transitioned.
  if (mapped === "Parts Requested" && hasWarehouseReview) {
    return "Availability Checked";
  }

  return mapped;
};

const normalizeItems = (items = []) =>
  items.map((item) => {
    const mappedStatus = normalizeByMap(item.stockStatus, ITEM_STATUS_MAP);
    const finalStatus = VALID_ITEM_STATUSES.has(mappedStatus)
      ? mappedStatus
      : "Parts Requested";

    return {
      ...item,
      stockStatus: finalStatus,
      availableQty: Number(item.availableQty) || 0,
      quantity: Number(item.quantity) || 0,
    };
  });

async function main() {
  const mongoUrl = process.env.ATLAS_URL;
  if (!mongoUrl) {
    throw new Error("ATLAS_URL is not set in the environment.");
  }

  await mongoose.connect(mongoUrl);

  const requisitions = await PartsRequisition.find().lean();
  if (requisitions.length === 0) {
    console.log("No parts requisitions found.");
    await mongoose.disconnect();
    return;
  }

  const ops = [];
  let changedCount = 0;

  for (const requisition of requisitions) {
    const normalizedStatus = normalizeRequisitionStatus(requisition);
    const finalStatus = VALID_REQUISITION_STATUSES.has(normalizedStatus)
      ? normalizedStatus
      : "Parts Requested";
    const normalizedItems = normalizeItems(requisition.items || []);

    const statusChanged = finalStatus !== requisition.status;
    const itemsChanged =
      JSON.stringify(normalizedItems) !== JSON.stringify(requisition.items || []);

    if (!statusChanged && !itemsChanged) {
      continue;
    }

    changedCount += 1;
    const update = {};
    if (statusChanged) update.status = finalStatus;
    if (itemsChanged) update.items = normalizedItems;

    ops.push({
      updateOne: {
        filter: { _id: requisition._id },
        update: { $set: update },
      },
    });
  }

  if (ops.length > 0) {
    await PartsRequisition.bulkWrite(ops, { ordered: false });
  }

  console.log(
    JSON.stringify(
      {
        totalDocuments: requisitions.length,
        changedDocuments: changedCount,
        unchangedDocuments: requisitions.length - changedCount,
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exit(1);
});

