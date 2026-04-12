const NotificationModel = require("../models/notificationModel");
const UserModel = require("../models/userModel");
const { sendPushNotificationToUsers } = require("./mobilePushService");

const ROLE_MANAGER = "maintenance manager";
const ROLE_OFFICER_IN_CHARGE = "officer-in-charge";
const ROLE_WAREHOUSE = "warehouse department";

const normalizeRole = (role = "") => role.trim().toLowerCase();

const uniqueStrings = (values = []) =>
  [...new Set(values.map((value) => String(value)).filter(Boolean))];

const uniqueRoles = (roles = []) =>
  [...new Set(roles.map((role) => normalizeRole(role)).filter(Boolean))];

const resolveUserIdByFullName = async (fullName) => {
  const trimmedName = fullName?.trim();

  if (!trimmedName) {
    return null;
  }

  const escapedName = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const user = await UserModel.findOne({
    $expr: {
      $regexMatch: {
        input: {
          $trim: {
            input: {
              $concat: ["$firstName", " ", "$lastName"],
            },
          },
        },
        regex: `^${escapedName}$`,
        options: "i",
      },
    },
  }).select("_id");

  return user?._id || null;
};

const getRequisitionerUserId = async (requisition) => {
  const directId = requisition?.staff?.requisitionerId;

  if (directId) {
    return directId;
  }

  return resolveUserIdByFullName(requisition?.staff?.requisitioner);
};

const createNotification = async ({
  title,
  description,
  requisition,
  recipientRoles = [],
  recipientUsers = [],
  metadata = {},
}) => {
  const normalizedRoles = uniqueRoles(recipientRoles);
  const normalizedUsers = uniqueStrings(recipientUsers);

  if (normalizedRoles.length === 0 && normalizedUsers.length === 0) {
    return;
  }

  await NotificationModel.create({
    title,
    description,
    module: "parts-requisition",
    entityType: "parts-requisition",
    entityId: requisition._id,
    recipientRoles: normalizedRoles,
    recipientUsers: normalizedUsers,
    metadata: {
      wrsNo: requisition.wrsNo,
      status: requisition.status,
      aircraft: requisition.aircraft,
      ...metadata,
    },
  });

  await sendPushNotificationToUsers({
    title,
    body: description,
    recipientRoles: normalizedRoles,
    recipientUsers: normalizedUsers,
    data: {
      module: "parts-requisition",
      targetScreen: "Parts Requisition",
      targetRequestId: String(requisition._id),
      wrsNo: requisition.wrsNo,
      status: requisition.status,
      ...metadata,
    },
  });
};

const createPartsRequisitionNotifications = async ({
  previousRequisition,
  requisition,
}) => {
  if (!requisition?._id) {
    return;
  }

  const requisitionerUserId = await getRequisitionerUserId(requisition);
  const managerRoles = [ROLE_MANAGER, ROLE_OFFICER_IN_CHARGE];
  const previousStatus = previousRequisition?.status;
  const currentStatus = requisition.status;
  const warehouseReviewBecameAvailable =
    !previousRequisition?.dateWarehouseReviewed &&
    !!requisition.dateWarehouseReviewed &&
    currentStatus === "Parts Requested";

  if (warehouseReviewBecameAvailable) {
    await createNotification({
      title: `Parts requisition ${requisition.wrsNo} is ready for review`,
      description:
        "Warehouse completed the stock review. Maintenance can now review the requisition.",
      requisition,
      recipientRoles: managerRoles,
      metadata: { notificationType: "warehouse-review-ready" },
    });
  }

  if (previousStatus === currentStatus) {
    return;
  }

  switch (currentStatus) {
    case "Availability Checked":
      await createNotification({
        title: `Parts requisition ${requisition.wrsNo} availability checked`,
        description:
          "Warehouse completed the stock review. Maintenance can now review the requisition.",
        requisition,
        recipientRoles: managerRoles,
        metadata: { notificationType: "availability-checked" },
      });
      break;
    case "To Be Ordered":
      await createNotification({
        title: `Parts requisition ${requisition.wrsNo} marked to be ordered`,
        description:
          "Some requested items are unavailable and need to be ordered.",
        requisition,
        recipientRoles: [ROLE_WAREHOUSE],
        recipientUsers: requisitionerUserId ? [requisitionerUserId] : [],
        metadata: { notificationType: "to-be-ordered" },
      });
      break;
    case "Ordered":
      await createNotification({
        title: `Ordered items are ready for ${requisition.wrsNo}`,
        description:
          "Warehouse updated the requisition and it is ready for maintenance approval.",
        requisition,
        recipientRoles: managerRoles,
        recipientUsers: requisitionerUserId ? [requisitionerUserId] : [],
        metadata: { notificationType: "ordered-ready" },
      });
      break;
    case "Approved":
      await createNotification({
        title: `Parts requisition ${requisition.wrsNo} approved`,
        description:
          "The requisition has been approved and can proceed to release or delivery.",
        requisition,
        recipientRoles: [ROLE_WAREHOUSE],
        recipientUsers: requisitionerUserId ? [requisitionerUserId] : [],
        metadata: { notificationType: "approved" },
      });
      break;
    case "Delivered":
      await createNotification({
        title: `Parts requisition ${requisition.wrsNo} delivered`,
        description: "Warehouse marked this requisition as delivered.",
        requisition,
        recipientUsers: requisitionerUserId ? [requisitionerUserId] : [],
        metadata: { notificationType: "delivered" },
      });
      break;
    case "Cancelled":
      await createNotification({
        title: `Parts requisition ${requisition.wrsNo} cancelled`,
        description: "This requisition was cancelled.",
        requisition,
        recipientRoles: managerRoles,
        recipientUsers: requisitionerUserId ? [requisitionerUserId] : [],
        metadata: { notificationType: "cancelled" },
      });
      break;
    default:
      break;
  }
};

module.exports = {
  createPartsRequisitionNotifications,
};
