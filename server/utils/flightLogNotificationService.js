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

const getFlightLogCreatorUserId = async (flightLog) => {
  if (flightLog?.createdByUserId) {
    return flightLog.createdByUserId;
  }

  return resolveUserIdByFullName(flightLog?.createdByName);
};

const getFlightLogLabel = (flightLog = {}) =>
  flightLog.rpc ? `RP-C ${flightLog.rpc}` : "the selected aircraft";

const getRecipientsForStatus = (status, creatorUserId, mechanicSideRoles) => {
  switch (status) {
    case "pending_acceptance":
    case "released":
      return {
        recipientRoles: [ROLE_PILOT],
        recipientUsers: creatorUserId ? [creatorUserId] : [],
      };
    case "accepted":
      return {
        recipientRoles: [...mechanicSideRoles, ROLE_PILOT],
        recipientUsers: creatorUserId ? [creatorUserId] : [],
      };
    case "completed":
      return {
        recipientRoles: [ROLE_MANAGER, ROLE_OFFICER_IN_CHARGE],
        recipientUsers: creatorUserId ? [creatorUserId] : [],
      };
    case "pending_release":
    default:
      return {
        recipientRoles: mechanicSideRoles,
        recipientUsers: [],
      };
  }
};

const createNotification = async ({
  title,
  description,
  flightLog,
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
    module: "flight-logs",
    entityType: "flight-log",
    entityId: flightLog._id,
    recipientRoles: normalizedRoles,
    recipientUsers: normalizedUsers,
    metadata: {
      rpc: flightLog.rpc,
      status: flightLog.status,
      aircraftType: flightLog.aircraftType,
      ...metadata,
    },
  });

  await sendPushNotificationToUsers({
    title,
    body: description,
    recipientRoles: normalizedRoles,
    recipientUsers: normalizedUsers,
    data: {
      module: "flight-logs",
      entityType: "flight-log",
      targetScreen: "Flight Logbook",
      targetFlightLogId: String(flightLog._id),
      status: flightLog.status,
      rpc: flightLog.rpc,
      ...metadata,
    },
  });
};

const createFlightLogNotifications = async ({
  previousFlightLog,
  flightLog,
}) => {
  if (!flightLog?._id) {
    return;
  }

  const creatorUserId = await getFlightLogCreatorUserId(flightLog);
  const mechanicSideRoles = [
    ROLE_MANAGER,
    ROLE_OFFICER_IN_CHARGE,
    ROLE_MECHANIC,
  ];
  const previousStatus = previousFlightLog?.status;
  const currentStatus = flightLog.status;
  const aircraftLabel = getFlightLogLabel(flightLog);

  if (!previousFlightLog) {
    if (flightLog.status === "pending_acceptance") {
      await createNotification({
        title: `Flight log for ${aircraftLabel} is ready for acceptance`,
        description:
          "A flight log is waiting for pilot acceptance.",
        flightLog,
        recipientRoles: [ROLE_PILOT],
        recipientUsers: creatorUserId ? [creatorUserId] : [],
        metadata: { notificationType: "created-pending-acceptance" },
      });
      return;
    }

    await createNotification({
      title: `Flight log for ${aircraftLabel} is ready for release`,
      description:
        "A new flight log needs mechanic-side review and release.",
      flightLog,
      recipientRoles: mechanicSideRoles,
      metadata: { notificationType: "created-pending-release" },
    });
    return;
  }

  const notifyMechanicForCompletion =
    !previousFlightLog?.notifiedForCompletion &&
    !!flightLog.notifiedForCompletion &&
    currentStatus === "accepted";

  if (notifyMechanicForCompletion) {
    await createNotification({
      title: `Flight log for RP-C ${flightLog.rpc} is ready to complete`,
      description:
        "The pilot flagged this accepted flight log for mechanic completion.",
      flightLog,
      recipientRoles: mechanicSideRoles,
      metadata: { notificationType: "ready-for-completion" },
    });

    if (previousStatus === currentStatus) {
      return;
    }
  }

  if (previousStatus === currentStatus) {
    const recipients = getRecipientsForStatus(
      currentStatus,
      creatorUserId,
      mechanicSideRoles,
    );

    await createNotification({
      title: `Flight log for ${aircraftLabel} has been updated.`,
      description: `Flight log for ${aircraftLabel} has been updated.`,
      flightLog,
      ...recipients,
      metadata: { notificationType: "updated" },
    });
    return;
  }

  switch (currentStatus) {
    case "pending_release":
      await createNotification({
        title: `Flight log for RP-C ${flightLog.rpc} is pending release`,
        description:
          "A flight log is waiting for mechanic-side release.",
        flightLog,
        recipientRoles: mechanicSideRoles,
        metadata: { notificationType: "pending-release" },
      });
      break;
    case "pending_acceptance":
      await createNotification({
        title: `Flight log for RP-C ${flightLog.rpc} was released`,
        description:
          "The flight log was released and is ready for pilot acceptance.",
        flightLog,
        recipientRoles: [ROLE_PILOT],
        recipientUsers: creatorUserId ? [creatorUserId] : [],
        metadata: { notificationType: "released" },
      });
      break;
    case "accepted":
      await createNotification({
        title: `Flight log for RP-C ${flightLog.rpc} was accepted`,
        description:
          "The pilot accepted this flight log. Mechanic completion may now proceed.",
        flightLog,
        recipientRoles: mechanicSideRoles,
        metadata: { notificationType: "accepted" },
      });
      break;
    case "completed":
      await createNotification({
        title: `Flight log for RP-C ${flightLog.rpc} was completed`,
        description:
          "The mechanic completed this flight log and updated the workflow.",
        flightLog,
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
  createFlightLogNotifications,
};
