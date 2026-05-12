const UserSession = require("../models/userSessionModel");

const touchSessionActivity = async (req, _res, next) => {
  try {
    const userId = req.user?.id;
    const sessionId = req.headers["x-session-id"];

    if (userId && sessionId) {
      await UserSession.findOneAndUpdate(
        { userId, sessionId, isActive: true },
        { lastActivityAt: new Date() },
      );
    }
  } catch (err) {
    console.error("Session activity update failed:", err.message);
  }

  next();
};

module.exports = { touchSessionActivity };
