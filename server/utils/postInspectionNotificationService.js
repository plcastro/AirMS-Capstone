const NotificationModel = require("../models/notificationModel");
const UserModel = require("../models/userModel");
const { sendPushNotificationToUsers } = require("./mobilePushService");

const ROLE_MANAGER = "maintenance manager";
const ROLE_OFFICER_IN_CHARGE = "officer-in-charge";
const ROLE_MECHANIC = "mechanic";

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

const getCreatorUserId = async (inspection) => {
  if (!inspection) {
    return null;
  }

  if (inspection.createdByUserId) {
    return inspection.createdByUserId;
  }

  return resolveUserIdByFullName(inspection.createdBy);
};

const getRecipientsForStatus = (
  status,
  creatorUserId,
  managerRoles,
  mechanicRoles,
) => {
  switch (status) {
    case "released":
      return {
        recipientRoles: [],
        recipientUsers: creatorUserId ? [creatorUserId] : [],
      };
    case "completed":
      return {
        recipientRoles: managerRoles,
        recipientUsers: creatorUserId ? [creatorUserId] : [],
      };
    case "pending":
    default:
      return {
        recipientRoles: mechanicRoles,
        recipientUsers: [],
      };
  }
};

const createNotification = async ({
  title,
  description,
  inspection,
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
    module: "post-flight inspections",
    entityType: "post-flight inspection",
    entityId: inspection._id,
    recipientRoles: normalizedRoles,
    recipientUsers: normalizedUsers,
    excludedUsers: uniqueStrings(excludedUsers),
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
    excludedUsers,
    data: {
      _id: String(notification._id),
      notificationId: String(notification._id),
      module: "post-flight inspections",
      targetScreen: "Post-Flight Inspection",
      targetPostInspectionId: String(inspection._id),
      status: inspection.status,
      rpc: inspection.rpc,
      ...metadata,
    },
  });
};

const createPostInspectionNotifications = async ({
  previousInspection,
  inspection,
  actorUserId = null,
}) => {
  if (!inspection?._id) {
    return;
  }

  const creatorUserId = await getCreatorUserId(inspection);
  const managerRoles = [ROLE_MANAGER, ROLE_OFFICER_IN_CHARGE];
  const mechanicRoles = [ROLE_MANAGER, ROLE_OFFICER_IN_CHARGE, ROLE_MECHANIC];
  const previousStatus = previousInspection?.status;
  const currentStatus = inspection.status;

  if (!previousInspection) {
    if (currentStatus === "pending") {
      await createNotification({
        title: `Post-inspection for ${inspection.rpc} is pending release`,
        description:
          "A new post-flight inspection is ready for mechanic review and release.",
        inspection,
        recipientRoles: mechanicRoles,
        excludedUsers: actorUserId ? [actorUserId] : [],
        metadata: { notificationType: "created-pending-release" },
      });
      return;
    }

    if (currentStatus === "released") {
      await createNotification({
        title: `Post-inspection for ${inspection.rpc} was released`,
        description:
          "The post-flight inspection is ready for pilot acceptance.",
        inspection,
        recipientUsers: creatorUserId ? [creatorUserId] : [],
        excludedUsers: actorUserId ? [actorUserId] : [],
        metadata: { notificationType: "created-released" },
      });
      return;
    }

    if (currentStatus === "completed") {
      await createNotification({
        title: `Post-inspection for ${inspection.rpc} was completed`,
        description: "The post-flight inspection has been completed.",
        inspection,
        recipientRoles: managerRoles,
        recipientUsers: creatorUserId ? [creatorUserId] : [],
        excludedUsers: actorUserId ? [actorUserId] : [],
        metadata: { notificationType: "created-completed" },
      });
      return;
    }
  }

  if (previousStatus === currentStatus) {
    const recipients = getRecipientsForStatus(
      currentStatus,
      creatorUserId,
      managerRoles,
      mechanicRoles,
    );

    await createNotification({
      title: `Post-inspection for ${inspection.rpc} has been updated`,
      description: "The post-flight inspection details were updated.",
      inspection,
      ...recipients,
      excludedUsers: actorUserId ? [actorUserId] : [],
      metadata: { notificationType: "updated" },
    });
    return;
  }

  switch (currentStatus) {
    case "released":
      await createNotification({
        title: `Post-inspection for ${inspection.rpc} is pending acceptance`,
        description:
          "This post-flight inspection was released and is waiting for pilot acceptance.",
        inspection,
        recipientUsers: creatorUserId ? [creatorUserId] : [],
        excludedUsers: actorUserId ? [actorUserId] : [],
        metadata: { notificationType: "released" },
      });
      break;
    case "completed":
      await createNotification({
        title: `Post-inspection for ${inspection.rpc} was completed`,
        description:
          "The post-flight inspection has been completed and updated.",
        inspection,
        recipientRoles: managerRoles,
        recipientUsers: creatorUserId ? [creatorUserId] : [],
        excludedUsers: actorUserId ? [actorUserId] : [],
        metadata: { notificationType: "completed" },
      });
      break;
    default:
      break;
  }
};

module.exports = {
  createPostInspectionNotifications,
};
