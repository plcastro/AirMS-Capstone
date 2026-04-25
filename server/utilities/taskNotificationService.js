const NotificationModel = require("../models/notificationModel");
const mongoose = require("mongoose");
const { sendPushNotificationToUsers } = require("./mobilePushService");

const ROLE_MANAGER = "maintenance manager";
const ROLE_OFFICER_IN_CHARGE = "officer-in-charge";
const ROLE_MECHANIC = "mechanic";

const uniqueStrings = (values = []) =>
  [...new Set(values.map((value) => String(value)).filter(Boolean))];

const uniqueObjectIdStrings = (values = []) =>
  uniqueStrings(values).filter((value) => mongoose.Types.ObjectId.isValid(value));

const uniqueRoles = (roles = []) =>
  [...new Set(roles.map((role) => String(role).trim().toLowerCase()).filter(Boolean))];

const createNotification = async ({
  title,
  description,
  task,
  recipientRoles = [],
  recipientUsers = [],
  metadata = {},
}) => {
  const normalizedRoles = uniqueRoles(recipientRoles);
  const normalizedUsers = uniqueObjectIdStrings(recipientUsers);

  if (normalizedRoles.length === 0 && normalizedUsers.length === 0) {
    return;
  }

  await NotificationModel.create({
    title,
    description,
    module: "tasks",
    entityType: "task",
    entityId: task._id,
    recipientRoles: normalizedRoles,
    recipientUsers: normalizedUsers,
    metadata: {
      status: task.status,
      assignedTo: task.assignedTo,
      assignedToName: task.assignedToName,
      ...metadata,
    },
  });

  await sendPushNotificationToUsers({
    title,
    body: description,
    recipientRoles: normalizedRoles,
    recipientUsers: normalizedUsers,
    data: {
      module: "tasks",
      entityType: "task",
      targetScreen: "Tasks",
      targetTaskId: String(task._id),
      status: task.status,
      title: task.title,
      assignedTo: task.assignedTo,
      assignedToName: task.assignedToName,
      ...metadata,
    },
  });
};

const createTaskNotifications = async ({ previousTask, task }) => {
  if (!task?._id) {
    return;
  }

  if (!previousTask) {
    await createNotification({
      title: `New task assigned: ${task.title}`,
      description: `A new task has been assigned to ${task.assignedToName || "a mechanic"}.`,
      task,
      recipientRoles: [ROLE_MECHANIC],
      recipientUsers: task.assignedTo ? [task.assignedTo] : [],
      metadata: { notificationType: "task-assigned" },
    });
    return;
  }

  const previousStatus = previousTask?.status;
  const currentStatus = task.status;
  const previousAssignee = String(previousTask?.assignedTo || "");
  const currentAssignee = String(task.assignedTo || "");

  if (previousAssignee && currentAssignee && previousAssignee !== currentAssignee) {
    await createNotification({
      title: `Task reassigned: ${task.title}`,
      description: `This task has been reassigned to ${task.assignedToName || "a mechanic"}.`,
      task,
      recipientRoles: [ROLE_MECHANIC],
      recipientUsers: [task.assignedTo, previousTask.assignedTo],
      metadata: { notificationType: "task-reassigned" },
    });
  }

  if (previousStatus === currentStatus) {
    if (["Turned in", "Approved"].includes(currentStatus)) {
      await createNotification({
        title: `Task updated: ${task.title}`,
        description: "This task was updated.",
        task,
        recipientRoles:
          currentStatus === "Turned in"
            ? [ROLE_MANAGER, ROLE_OFFICER_IN_CHARGE]
            : [ROLE_MECHANIC],
        recipientUsers:
          currentStatus === "Approved" && task.assignedTo
            ? [task.assignedTo]
            : [],
        metadata: { notificationType: "task-updated" },
      });
    }
    return;
  }

  switch (currentStatus) {
    case "Turned in":
      await createNotification({
        title: `Task turned in: ${task.title}`,
        description: `This task has been turned in and needs review.`,
        task,
        recipientRoles: [ROLE_MANAGER, ROLE_OFFICER_IN_CHARGE],
        recipientUsers: [],
        metadata: { notificationType: "task-turned-in" },
      });
      break;
    case "Returned":
      await createNotification({
        title: `Task returned: ${task.title}`,
        description: `Your task has been returned for corrections.`,
        task,
        recipientRoles: [ROLE_MECHANIC],
        recipientUsers: task.assignedTo ? [task.assignedTo] : [],
        metadata: { notificationType: "task-returned" },
      });
      break;
    case "Approved":
      await createNotification({
        title: `Task approved: ${task.title}`,
        description: `This task has been approved.`,
        task,
        recipientRoles: [ROLE_MECHANIC],
        recipientUsers: task.assignedTo ? [task.assignedTo] : [],
        metadata: { notificationType: "task-approved" },
      });
      break;
    case "Completed":
      await createNotification({
        title: `Task completed: ${task.title}`,
        description: `This task has been completed.`,
        task,
        recipientRoles: [ROLE_MANAGER, ROLE_OFFICER_IN_CHARGE],
        recipientUsers: task.assignedTo ? [task.assignedTo] : [],
        metadata: { notificationType: "task-completed" },
      });
      break;
    default:
      break;
  }
};

module.exports = {
  createTaskNotifications,
};
