const crypto = require("crypto");
const Notification = require("../models/notificationModel");
const UserSession = require("../models/userSessionModel");
const { SESSION_IDLE_LIMIT_MS, sessionActivityAt } = require("../utils/sessionIdle");
const { sendPushNotificationToUsers } = require("../utils/mobilePushService");

const createSessionWarning = async (req, res) => {
  const { lastActivityAt, thresholdMinutes } = req.body || {};
  if (!Number.isFinite(lastActivityAt) || lastActivityAt <= 0 || ![15, 10, 5].includes(thresholdMinutes)) {
    return res.status(400).json({ message: "Invalid session warning" });
  }
  try {
    const session = await UserSession.findOne({
      userId: req.user.id, sessionId: req.user.sessionId, isActive: true,
    });
    if (!session) return res.status(401).json({ message: "Session is no longer active" });

    const now = Date.now();
    const activityAt = sessionActivityAt(session, undefined, now);
    const remaining = SESSION_IDLE_LIMIT_MS - (now - activityAt);
    const currentThreshold = [15, 10, 5].filter(minutes => remaining <= minutes * 60000).at(-1);
    // Discard delayed warnings if activity resumed or a later warning is now due.
    if (activityAt !== lastActivityAt || remaining <= 0 || currentThreshold !== thresholdMinutes) {
      return res.status(204).end();
    }

    // MongoDB's existing unique _id index makes concurrent tabs/retries idempotent.
    const notificationId = crypto.createHash("sha256")
      .update(JSON.stringify(["session-warning", String(req.user.id), session.sessionId, activityAt, thresholdMinutes]))
      .digest("hex").slice(0, 24);
    const minutesRemaining = Math.ceil(remaining / 60000);
    const platform = session.platform === "MOBILE" ? "mobile" : "web";
    const title = `${platform === "mobile" ? "Mobile" : "Web"} session expiring`;
    const description = `Your ${platform} session will expire in ${minutesRemaining} minutes due to inactivity. Continue using the app to stay signed in.`;
    let notification;
    try {
      notification = await Notification.create({
        _id: notificationId, title, description, module: "sessions", entityType: "session",
        entityId: session._id, recipientUsers: [req.user.id], recipientRoles: [],
        metadata: { sessionId: session.sessionId, thresholdMinutes, expiresAt: activityAt + SESSION_IDLE_LIMIT_MS },
      });
    } catch (error) {
      if (error.code === 11000) return res.status(200).json({ created: false, notificationId });
      throw error;
    }
    await sendPushNotificationToUsers({
      title, body: description, recipientUsers: [req.user.id],
      data: { notificationId: String(notification._id), module: "sessions", entityType: "session",
        sessionId: session.sessionId, expiresAt: activityAt + SESSION_IDLE_LIMIT_MS },
    });
    return res.status(201).json({ created: true, notificationId });
  } catch (error) {
    console.error("Failed to create session notification:", error);
    return res.status(500).json({ message: "Failed to create session notification" });
  }
};

module.exports = { createSessionWarning };
