const partsRequisitionModel = require("../models/partsRequisitionModel");
const { auditLog } = require("./logsController");
const {
  createPartsRequisitionNotifications,
} = require("../utils/partsRequisitionNotificationService");

const ALLOWED_STATUS_TRANSITIONS = {
  "Parts Requested": new Set(["Availability Checked", "Cancelled"]),
  "Availability Checked": new Set(["To Be Ordered", "Approved", "Cancelled"]),
  "To Be Ordered": new Set(["Ordered", "Cancelled"]),
  Ordered: new Set(["Approved", "Cancelled"]),
  Approved: new Set(["Delivered", "Cancelled"]),
  Delivered: new Set([]),
  Cancelled: new Set([]),
};

const isStatusTransitionAllowed = (currentStatus, nextStatus) => {
  if (!nextStatus || currentStatus === nextStatus) {
    return true;
  }

  const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[currentStatus];
  if (!allowedTransitions) {
    // Keep backward compatibility for legacy statuses.
    return true;
  }

  return allowedTransitions.has(nextStatus);
};

const normalizeRequisitionStatus = (status) => {
  switch (status) {
    case "Pending":
      return "Parts Requested";
    case "Completed":
      return "Delivered";
    case "Rejected":
      return "Cancelled";
    case "In Progress":
      return "Ordered";
    default:
      return status;
  }
};

const sanitizeIncomingItems = (items = []) =>
  items.map((item) => ({
    ...item,
    particular:
      item.particular ||
      item.codeParticular?.[0]?.particular ||
      item.itemName ||
      "",
    quantity: Number(item.quantity) || 0,
    availableQty: Number(item.availableQty) || 0,
  }));

const ITEM_AVAILABLE_QTY_LOCKED_STATUSES = new Set([
  "In Stock",
  "Ordered",
  "Approved",
  "Delivered",
  "Cancelled",
]);

const hasLockedItemAvailableQtyChanges = (
  existingItems = [],
  incomingItems = [],
) => {
  const currentById = new Map(
    existingItems.map((item) => [
      String(item._id),
      {
        availableQty: Number(item.availableQty) || 0,
        stockStatus: item.stockStatus,
      },
    ]),
  );

  return incomingItems.some((item) => {
    const id = String(item._id || "");
    if (!id || !currentById.has(id)) return false;

    const currentItem = currentById.get(id);
    const hasQtyChanged =
      (Number(item.availableQty) || 0) !== currentItem.availableQty;

    return (
      hasQtyChanged &&
      ITEM_AVAILABLE_QTY_LOCKED_STATUSES.has(currentItem.stockStatus)
    );
  });
};
const getAuditActorId = (req, fallbackId = null) => req.user?.id || fallbackId;
const withActorId = (req, action, fallbackId = null) => {
  const actorId = getAuditActorId(req, fallbackId);
  return {
    actorId,
    action: actorId ? `${action} (actorId: ${actorId})` : action,
  };
};

const getAllRequisitions = async (req, res) => {
  try {
    const requisitions = await partsRequisitionModel
      .find()
      .sort({ createdAt: -1 });
    res.status(200).json(requisitions);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const getRequisitionById = async (req, res) => {
  const requisitionId = req.params.id;
  try {
    const requisition = await partsRequisitionModel.findById(requisitionId);
    if (!requisition) {
      return res.status(404).json({ message: "Requisition not found" });
    }
    res.status(200).json(requisition);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const createRequisition = async (req, res) => {
  try {
    const {
      wrsNo,
      aircraft,
      staff,
      items,
      dateRequested,
      dateApproved,
      dateReceived,
      status,
    } = req.body;

    const newRequisition = new partsRequisitionModel({
      wrsNo,
      aircraft,
      staff: {
        ...staff,
        requisitionerId: req.user?.id || staff?.requisitionerId,
      },
      items: sanitizeIncomingItems(items),
      dateRequested,
      dateApproved,
      dateReceived,
      status: status || "Parts Requested",
    });
    const savedRequisition = await newRequisition.save();
    const audit = withActorId(
      req,
      `Parts requisition created: ${savedRequisition.wrsNo}`,
      savedRequisition._id,
    );
    await auditLog(audit.action, audit.actorId);
    await createPartsRequisitionNotifications({
      previousRequisition: null,
      requisition: savedRequisition,
    });
    res.status(201).json(savedRequisition);
  } catch (error) {
    res.status(400).json({ message: "Invalid data", error: error.message });
  }
};

const updateRequisitionStatus = async (req, res) => {
  try {
    const existingRequisition = await partsRequisitionModel.findById(
      req.params.id,
    );

    if (!existingRequisition) {
      return res.status(404).json({ message: "Requisition not found" });
    }

    const updatePayload = {};
    const normalizedExistingStatus = normalizeRequisitionStatus(
      existingRequisition.status,
    );

    [
      "status",
      "aircraft",
      "items",
      "dateRequested",
      "dateReceived",
      "dateApproved",
      "dateWarehouseReviewed",
      "dateOrdered",
      "dateDelivered",
      "dateCancelled",
    ].forEach((field) => {
      if (req.body[field] !== undefined) {
        updatePayload[field] = req.body[field];
      }
    });

    if (req.body.items !== undefined) {
      const normalizedIncomingItems = sanitizeIncomingItems(req.body.items);

      if (
        hasLockedItemAvailableQtyChanges(
          existingRequisition.items,
          normalizedIncomingItems,
        )
      ) {
        return res.status(400).json({
          message:
            "Available quantity cannot be edited for items that are already in stock, restocked, approved, delivered, or cancelled.",
        });
      }

      updatePayload.items = normalizedIncomingItems;
    }

    const staffMappings = {
      requisitioner: "staff.requisitioner",
      requisitionerId: "staff.requisitionerId",
      approvedBy: "staff.approvedBy",
      receiver: "staff.receiver",
      notedBy: "staff.notedBy",
      warehouseBy: "staff.warehouseBy",
      deliveredBy: "staff.deliveredBy",
    };

    Object.entries(staffMappings).forEach(([requestField, modelField]) => {
      if (req.body[requestField] !== undefined) {
        updatePayload[modelField] = req.body[requestField];
      }
    });

    const isFirstWarehouseReview =
      normalizedExistingStatus === "Parts Requested" &&
      !existingRequisition.dateWarehouseReviewed &&
      req.body.dateWarehouseReviewed !== undefined &&
      updatePayload.items !== undefined;

    if (isFirstWarehouseReview) {
      updatePayload.status = "Availability Checked";
    }

    if (updatePayload.status !== undefined) {
      updatePayload.status = normalizeRequisitionStatus(updatePayload.status);
    }

    if (
      updatePayload.status !== undefined &&
      !isStatusTransitionAllowed(normalizedExistingStatus, updatePayload.status)
    ) {
      return res.status(400).json({
        message: `Invalid status transition from ${normalizedExistingStatus} to ${updatePayload.status}`,
      });
    }

    const updatedRequisition = await partsRequisitionModel.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      {
        returnDocument: "after",
        runValidators: true,
      },
    );
    const audit = withActorId(
      req,
      `Parts requisition updated: ${updatedRequisition.wrsNo}, status set to ${updatedRequisition.status}`,
      updatedRequisition._id,
    );
    await auditLog(audit.action, audit.actorId);
    await createPartsRequisitionNotifications({
      previousRequisition: existingRequisition,
      requisition: updatedRequisition,
    });
    res.status(200).json(updatedRequisition);
  } catch (error) {
    res.status(400).json({ message: "Update failed", error: error.message });
  }
};

module.exports = {
  getAllRequisitions,
  getRequisitionById,
  createRequisition,
  updateRequisitionStatus,
};
