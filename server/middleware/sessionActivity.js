const UserSession = require("../models/userSessionModel");

const touchSessionActivity = async (req, _res, next) => {
  try {
    const userId = req.user?.id;
    const sessionId = req.headers["x-session-id"] || req.user?.sessionId;

    if (userId && sessionId && req.sessionActivityAt) {
      await UserSession.findOneAndUpdate(
        { userId, sessionId, isActive: true },
        { $max: { lastActivityAt: new Date(req.sessionActivityAt) } },
      );
    }
  } catch (err) {
    console.error("Session activity update failed:", err.message);
  }

  next();
};

module.exports = { touchSessionActivity };
