const NotificationModel = require("../models/notificationModel");
const { sendPushNotificationToUsers } = require("./mobilePushService");

const uniqueStrings = (values) => [
  ...new Set(values.filter((value) => value != null && value !== "").map(String)),
];

const getNotificationContent = (previousFlightLog, flightLog) => {
  const aircraft = flightLog.rpc || "the selected aircraft";
  const status = flightLog.status;
  if (!previousFlightLog) {
    if (["pending_acceptance", "released"].includes(status)) {
      return {
        title: `Flight log for ${aircraft} is ready for acceptance`,
        description: "Your assigned flight log is waiting for pilot acceptance.",
        notificationType: "created-pending-acceptance",
      };
    }
    return {
      title: `Flight log for ${aircraft} was created`,
      description: "A new flight log has been created for your assigned flight.",
      notificationType: "created-pending-release",
    };
  }

  if (!previousFlightLog.notifiedForCompletion && flightLog.notifiedForCompletion && status === "accepted") {
    return {
      title: `Flight log for ${aircraft} is ready to complete`,
      description: "The pilot submitted this flight log for mechanic completion.",
      notificationType: "ready-for-completion",
    };
  }

  if (previousFlightLog.status !== status) {
    const transitions = {
      pending_release: ["is pending release", "Your assigned flight log is waiting for mechanic release.", "pending-release"],
      pending_acceptance: ["was released", "Your assigned flight log was released and is ready for pilot acceptance.", "released"],
      released: ["was released", "Your assigned flight log was released and is ready for pilot acceptance.", "released"],
      accepted: ["was accepted", "The pilot accepted your assigned flight log.", "accepted"],
      completed: ["was completed", "The mechanic completed your assigned flight log.", "completed"],
      submitted: ["is ready for review", "Flight details were submitted for mechanic review.", "submitted"],
      returned_to_pilot: ["was returned to the pilot", "Review the correction comment in your flight workspace.", "returned-to-pilot"],
      returned_to_mechanic: ["was returned to the mechanic", "Review the correction comment in your flight workspace.", "returned-to-mechanic"],
    };
    const transition = transitions[status];
    if (transition) {
      const [action, description, notificationType] = transition;
      return { title: `Flight log for ${aircraft} ${action}`, description, notificationType };
    }
  }

  return {
    title: `Flight log for ${aircraft} has been updated.`,
    description: `Your assigned flight log for ${aircraft} has been updated.`,
    notificationType: "updated",
  };
};

const createFlightLogNotifications = async ({ previousFlightLog, flightLog, actorUserId = null }) => {
  if (!flightLog?._id) return;

  // Use only the current assignments, including after a reassignment. Never
  // infer recipients from a role, signature, creator name, or previous crew.
  const recipientUsers = uniqueStrings([
    flightLog.assignedPilot?.userId,
    flightLog.assignedMechanic?.userId,
  ]).filter((userId) => userId !== String(actorUserId || ""));
  if (!recipientUsers.length) return;

  const excludedUsers = actorUserId ? [String(actorUserId)] : [];
  const { title, description, notificationType } = getNotificationContent(previousFlightLog, flightLog);
  const metadata = {
    rpc: flightLog.rpc,
    status: flightLog.status,
    aircraftType: flightLog.aircraftType,
    notificationType,
  };
  const notification = await NotificationModel.create({
    title,
    description,
    module: "flight-logs",
    entityType: "flight-log",
    entityId: flightLog._id,
    recipientRoles: [],
    recipientUsers,
    excludedUsers,
    metadata,
  });

  await sendPushNotificationToUsers({
    title,
    body: description,
    recipientRoles: [],
    recipientUsers,
    excludedUsers,
    data: {
      _id: String(notification._id),
      notificationId: String(notification._id),
      module: "flight-logs",
      entityType: "flight-log",
      targetScreen: "Flight Logbook",
      targetFlightLogId: String(flightLog._id),
      ...metadata,
    },
  });
};

module.exports = { createFlightLogNotifications };
