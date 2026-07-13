const admin = require("firebase-admin");
const UserModel = require("../models/userModel");
const { sendToUsers } = require("./realtimeEvents");

const ROLE_TO_JOB_TITLE = {
  "maintenance manager": "Maintenance Manager",
  "officer-in-charge": "Officer-In-Charge",
  mechanic: "Mechanic",
  "warehouse department": "Warehouse Department",
  pilot: "Pilot",
  superadmin: "superadmin",
};

const uniqueValues = (values = []) => [
  ...new Set(values.map(String).filter(Boolean)),
];

const parseServiceAccount = () => {
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (encoded) {
    return JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    return JSON.parse(raw);
  }

  return null;
};

const getFirebaseMessaging = () => {
  if (!admin.apps.length) {
    const serviceAccount = parseServiceAccount();

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
  }

  return admin.messaging();
};

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
    "mobilePushDevices.fcmToken",
  );

  return uniqueValues(
    users.flatMap((user) =>
      (user.mobilePushDevices || []).map((device) => device.fcmToken),
    ),
  );
};

const removeInvalidPushTokens = async (tokens = []) => {
  if (!tokens.length) return;

  await UserModel.updateMany(
    { "mobilePushDevices.fcmToken": { $in: tokens } },
    {
      $pull: {
        mobilePushDevices: {
          fcmToken: { $in: tokens },
        },
      },
    },
  );
};

const stringifyData = (data = {}) =>
  Object.fromEntries(
    Object.entries(data || {})
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [
        key,
        typeof value === "string" ? value : JSON.stringify(value),
      ]),
  );

const sendPushNotificationToUsers = async ({
  title,
  body,
  recipientRoles = [],
  recipientUsers = [],
  data = {},
  android = {},
}) => {
  try {
    const roleUserIds = await getUserIdsForRoles(recipientRoles);
    const userIds = uniqueValues([...recipientUsers, ...roleUserIds]);
    const fcmTokens = await getPushTokensForUsers(userIds);

    sendToUsers(userIds, "notification-created", {
      title,
      description: body,
      data,
      createdAt: new Date().toISOString(),
    });

    if (fcmTokens.length === 0) {
      console.log("FCM push skipped: no registered tokens", {
        userCount: userIds.length,
        recipientUsers,
        recipientRoles,
      });
      return;
    }

    console.log("Sending FCM push", {
      userCount: userIds.length,
      tokenCount: fcmTokens.length,
      title,
    });

    const response = await getFirebaseMessaging().sendEachForMulticast({
      tokens: fcmTokens,
      notification: {
        title: String(title || "AirMS"),
        body: String(body || "You have a new notification."),
      },
      data: stringifyData(data),
      android: {
        ...(android.collapseKey
          ? { collapseKey: String(android.collapseKey) }
          : {}),
        priority: "high",
        notification: {
          sound: "default",
          channelId: android.channelId ? String(android.channelId) : "airms-high-priority",
          priority: "max",
          visibility: "public",
          defaultVibrateTimings: true,
          ...(android.tag ? { tag: String(android.tag) } : {}),
        },
      },
    });

    console.log("FCM push result", {
      successCount: response.successCount,
      failureCount: response.failureCount,
    });

    const invalidTokens = [];
    response.responses.forEach((result, index) => {
      if (result.success) return;

      const code = result.error?.code;
      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token"
      ) {
        invalidTokens.push(fcmTokens[index]);
      } else {
        console.error("FCM push failed:", code, result.error?.message);
      }
    });

    await removeInvalidPushTokens(invalidTokens);
  } catch (error) {
    console.error("sendPushNotificationToUsers error:", error);
  }
};

module.exports = {
  sendPushNotificationToUsers,
};
