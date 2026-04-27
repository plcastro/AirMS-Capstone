const UserModel = require("../models/userModel");

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const ROLE_TO_JOB_TITLE = {
  "maintenance manager": "Maintenance Manager",
  "officer-in-charge": "Officer-In-Charge",
  mechanic: "Mechanic",
  "warehouse department": "Warehouse Department",
  pilot: "Pilot",
  admin: "Admin",
};

const uniqueValues = (values = []) => [...new Set(values.map(String).filter(Boolean))];

const getUserIdsForRoles = async (roles = []) => {
  if (!roles.length) {
    return [];
  }

  const users = await UserModel.find({
    jobTitle: {
      $in: roles
        .map((role) => ROLE_TO_JOB_TITLE[String(role).trim().toLowerCase()])
        .filter(Boolean),
    },
  }).select("_id");

  return users.map((user) => String(user._id));
};

const getPushTokensForUsers = async (userIds = []) => {
  if (!userIds.length) {
    return [];
  }

  const users = await UserModel.find({ _id: { $in: userIds } }).select(
    "mobilePushDevices.expoPushToken",
  );

  return uniqueValues(
    users.flatMap((user) =>
      (user.mobilePushDevices || []).map((device) => device.expoPushToken),
    ),
  );
};

const sendPushNotificationToUsers = async ({
  title,
  body,
  recipientRoles = [],
  recipientUsers = [],
  data = {},
}) => {
  try {
    const roleUserIds = await getUserIdsForRoles(recipientRoles);
    const userIds = uniqueValues([...recipientUsers, ...roleUserIds]);
    const expoPushTokens = await getPushTokensForUsers(userIds);

    if (expoPushTokens.length === 0) {
      return;
    }

    await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        expoPushTokens.map((to) => ({
          to,
          sound: "default",
          title,
          body,
          data,
        })),
      ),
    });
  } catch (error) {
    console.error("sendPushNotificationToUsers error:", error);
  }
};

module.exports = {
  sendPushNotificationToUsers,
};
