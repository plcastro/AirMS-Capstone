const NotificationModel = require("../models/notificationModel");
const UserModel = require("../models/userModel");
const { sendPushNotificationToUsers } = require("./mobilePushService");
const { statusLabel } = require("../../shared/partsRequisitionWorkflow.js");

const ROLE_OFFICER_IN_CHARGE = "officer-in-charge";
const ROLE_WAREHOUSE = "warehouse personnel";

const normalizeRole = (role = "") => role.trim().toLowerCase();

const uniqueStrings = (values = []) => [
  ...new Set(
    values
      .filter((value) => value !== undefined && value !== null && value !== "")
      .map((value) => String(value)),
  ),
];

const uniqueRoles = (roles = []) => [
  ...new Set(roles.map((role) => normalizeRole(role)).filter(Boolean)),
];

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
  excludedUsers = [],
  metadata = {},
}) => {
  const normalizedRoles = uniqueRoles(recipientRoles);
  const normalizedUsers = uniqueStrings(recipientUsers);

  if (normalizedRoles.length === 0 && normalizedUsers.length === 0) {
    return;
  }

  const notification = await NotificationModel.create({
    title,
    description,
    module: "parts-requisition",
    entityType: "parts-requisition",
    entityId: requisition._id,
    recipientRoles: normalizedRoles,
    recipientUsers: normalizedUsers,
    excludedUsers: uniqueStrings(excludedUsers),
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
    excludedUsers,
    data: {
      _id: String(notification._id),
      notificationId: String(notification._id),
      module: "parts-requisition",
      targetScreen: "Parts Requisition",
      targetRequestId: String(requisition._id),
      wrsNo: requisition.wrsNo,
      status: requisition.status,
      ...metadata,
    },
  });
};

const createPartsRequisitionNotifications = async ({ previousRequisition, requisition, actorUserId }) => {
  const requester = await getRequisitionerUserId(requisition);
  const created = !previousRequisition;
  await createNotification({
    title: `Parts requisition ${requisition.wrsNo}: ${statusLabel(requisition.status)}`,
    description: created ? "A new requisition needs a stock check." : requisition.status === "Delivered" ? "Your parts are ready for pickup. Please confirm receipt to close your requisition." : `Parts requisition updated: ${statusLabel(requisition.status)}.`,
    requisition,
    recipientRoles: created ? [ROLE_WAREHOUSE] : [ROLE_WAREHOUSE, ROLE_OFFICER_IN_CHARGE, "admin staff"],
    recipientUsers: requester ? [requester] : [],
    excludedUsers: actorUserId ? [actorUserId] : [],
    metadata: { notificationType: created ? "created" : "updated" },
  });
};
const sendRequisitionFollowUp = async ({ requisition, actorUserId }) => {
  const { followUpTarget } = require("../../shared/partsRequisitionWorkflow.js");
  const target = followUpTarget(requisition);
  if (!target) return;
  const requester = target === "requester" ? await getRequisitionerUserId(requisition) : null;
  await createNotification({
    title: `Follow up: ${requisition.wrsNo}`,
    description: target === "warehouse" ? "Please update the stock status for this requisition." : "Please confirm receipt of your delivered parts.",
    requisition,
    recipientRoles: target === "warehouse" ? [ROLE_WAREHOUSE] : [],
    recipientUsers: requester ? [requester] : [],
    excludedUsers: [],
    metadata: { notificationType: "follow-up", actorUserId },
  });
};
module.exports = { createPartsRequisitionNotifications, sendRequisitionFollowUp };
