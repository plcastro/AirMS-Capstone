const NotificationModel = require("../models/notificationModel");
const { sendPushNotificationToUsers } = require("./mobilePushService");

const createPreInspectionNotifications = async ({ previousInspection, inspection, actorUserId = null }) => {
  if (!inspection?._id) return;
  const recipientUsers = [...new Set([
    inspection.assignedPilot?.userId,
    inspection.assignedMechanic?.userId,
  ].filter(Boolean).map(String))].filter((id) => id !== String(actorUserId || ""));
  if (!recipientUsers.length) return;

  const status = inspection.status;
  const changed = !previousInspection || previousInspection.status !== status;
  const action = changed ? ({ pending: "is pending release", released: "is ready for pilot acceptance", completed: "was completed" }[status] || "was updated") : "was updated";
  const notificationType = !previousInspection
    ? (status === "pending" ? "created-pending-release" : `created-${status}`)
    : changed ? status : "updated";
  const title = `Pre-inspection for ${inspection.rpc} ${action}`;
  const description = `Your assigned pre-flight inspection ${action}.`;
  const excludedUsers = actorUserId ? [String(actorUserId)] : [];
  const metadata = { rpc: inspection.rpc, status, aircraftType: inspection.aircraftType, notificationType };
  const notification = await NotificationModel.create({
    title, description, module: "pre-flight inspections", entityType: "pre-flight inspection",
    entityId: inspection._id, recipientRoles: [], recipientUsers, excludedUsers, metadata,
  });
  await sendPushNotificationToUsers({
    title, body: description, recipientRoles: [], recipientUsers, excludedUsers,
    data: {
      _id: String(notification._id), notificationId: String(notification._id),
      module: "pre-flight inspections", targetScreen: "Pre-Flight Inspection",
      targetPreInspectionId: String(inspection._id), ...metadata,
    },
  });
};

module.exports = { createPreInspectionNotifications };
