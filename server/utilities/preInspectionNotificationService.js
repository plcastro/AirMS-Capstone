const NotificationModel = require("../models/notificationModel");
const UserModel = require("../models/userModel");
const { sendPushNotificationToUsers } = require("./mobilePushService");

const ROLE_MANAGER = "maintenance manager";
const ROLE_OFFICER_IN_CHARGE = "officer-in-charge";
const ROLE_MECHANIC = "mechanic";
const ROLE_PILOT = "pilot";

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

const getCreatorUserId = async (inspection) => {
  if (!inspection) {
    return null;
  }

  if (inspection.createdByUserId) {
    return inspection.createdByUserId;
  }

  return resolveUserIdByFullName(inspection.createdBy);
};

const createNotification = async ({
  title,
  description,
  inspection,
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
    module: "pre-inspections",
    entityType: "pre-inspection",
    entityId: inspection._id,
    recipientRoles: normalizedRoles,
    recipientUsers: normalizedUsers,
    metadata: {
      rpc: inspection.rpc,
      status: inspection.status,
      aircraftType: inspection.aircraftType,
      ...metadata,
    },
  });

  await sendPushNotificationToUsers({
    title,
    body: description,
    recipientRoles: normalizedRoles,
    recipientUsers: normalizedUsers,
    data: {
      module: "pre-inspections",
      targetScreen: "Pre-Inspection",
      targetPreInspectionId: String(inspection._id),
      status: inspection.status,
      rpc: inspection.rpc,
      ...metadata,
    },
  });
};

const createPreInspectionNotifications = async ({
  previousInspection,
  inspection,
}) => {
  if (!inspection?._id) {
    return;
  }

  const creatorUserId = await getCreatorUserId(inspection);
  const mechanicRoles = [ROLE_MANAGER, ROLE_OFFICER_IN_CHARGE, ROLE_MECHANIC];
  const previousStatus = previousInspection?.status;
  const currentStatus = inspection.status;

  if (!previousInspection) {
    if (currentStatus === "pending") {
      await createNotification({
        title: `Pre-inspection for RP-C ${inspection.rpc} is ready for release`,
        description:
          "A new pre-flight inspection needs mechanic review and release.",
        inspection,
        recipientRoles: mechanicRoles,
        metadata: { notificationType: "created-pending-release" },
      });
      return;
    }

    if (currentStatus === "released") {
      await createNotification({
        title: `Pre-inspection for RP-C ${inspection.rpc} was released`,
        description: "The pre-flight inspection is ready for pilot acceptance.",
        inspection,
        recipientRoles: [ROLE_PILOT],
        recipientUsers: creatorUserId ? [creatorUserId] : [],
        metadata: { notificationType: "created-released" },
      });
      return;
    }

    if (currentStatus === "completed") {
      await createNotification({
        title: `Pre-inspection for RP-C ${inspection.rpc} was completed`,
        description:
          "The pre-flight inspection has been completed.",
        inspection,
        recipientRoles: [ROLE_MANAGER, ROLE_OFFICER_IN_CHARGE],
        recipientUsers: creatorUserId ? [creatorUserId] : [],
        metadata: { notificationType: "created-completed" },
      });
      return;
    }
  }

  if (previousStatus === currentStatus) {
    return;
  }

  switch (currentStatus) {
    case "released":
      await createNotification({
        title: `Pre-inspection for RP-C ${inspection.rpc} is pending acceptance`,
        description:
          "This pre-flight inspection was released and is waiting for pilot acceptance.",
        inspection,
        recipientRoles: [ROLE_PILOT],
        recipientUsers: creatorUserId ? [creatorUserId] : [],
        metadata: { notificationType: "released" },
      });
      break;
    case "completed":
      await createNotification({
        title: `Pre-inspection for RP-C ${inspection.rpc} was completed`,
        description:
          "The pre-flight inspection has been completed and updated.",
        inspection,
        recipientRoles: [ROLE_MANAGER, ROLE_OFFICER_IN_CHARGE],
        recipientUsers: creatorUserId ? [creatorUserId] : [],
        metadata: { notificationType: "completed" },
      });
      break;
    default:
      break;
  }
};

module.exports = {
  createPreInspectionNotifications,
};
