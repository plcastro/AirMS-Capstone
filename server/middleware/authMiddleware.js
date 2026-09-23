const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const UserModel = require("../models/userModel");
const UserSession = require("../models/userSessionModel");
const { updateRequestContext } = require("./requestContext");

const DEFAULT_SESSION_IDLE_LIMIT_MS = 15 * 60 * 1000;
const CLIENT_ACTIVITY_GRACE_MS = 30 * 1000;

const isMobilePlatform = (platform) =>
  String(platform || "").toUpperCase() === "MOBILE";

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded?.id;
    const sessionId = req.headers["x-session-id"] || decoded?.sessionId || null;

    if (!userId || !sessionId) {
      return res.status(401).json({ message: "Session context missing" });
    }

    const session = await UserSession.findOne({
      userId,
      sessionId,
      isActive: true,
    });

    if (!session) {
      return res.status(401).json({ message: "Session is no longer active" });
    }

    const now = Date.now();
    const lastActivityAt = new Date(
      session.lastActivityAt || session.loginAt || now,
    ).getTime();
    const platform =
      req.headers["x-platform"] || decoded?.platform || "UNKNOWN";

    if (!isMobilePlatform(platform)) {
      const clientActiveAt = Number(req.headers["x-client-active-at"]);
      const hasRecentClientActivity =
        Number.isFinite(clientActiveAt) &&
        clientActiveAt <= now + CLIENT_ACTIVITY_GRACE_MS &&
        now - clientActiveAt <= DEFAULT_SESSION_IDLE_LIMIT_MS;
      const effectiveLastActivityAt = hasRecentClientActivity
        ? Math.max(lastActivityAt, clientActiveAt)
        : lastActivityAt;
      const inactiveForMs = now - effectiveLastActivityAt;

      if (inactiveForMs > DEFAULT_SESSION_IDLE_LIMIT_MS) {
        await UserSession.findOneAndUpdate(
          { userId, sessionId, isActive: true },
          { isActive: false, logoutAt: new Date(), lastActivityAt: new Date() },
        );
        return res
          .status(401)
          .json({ message: "Session timed out due to inactivity" });
      }
    }

    await UserSession.findOneAndUpdate(
      { userId, sessionId, isActive: true },
      { lastActivityAt: new Date() },
    );

    const user = await UserModel.findById(userId)
      .select("username email jobTitle access licenseNo status")
      .lean();

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.status === "deactivated") {
      return res.status(403).json({ message: "Account deactivated" });
    }

    req.user = {
      ...decoded,
      id: String(user._id),
      _id: String(user._id),
      userId: String(user._id),
      sub: String(user._id),
      username: user.username,
      email: user.email,
      jobTitle: user.jobTitle,
      access: user.access,
      licenseNo: user.licenseNo,
      status: user.status,
      sessionId,
      platform,
      base: req.headers["x-base"] || decoded.base,
    };
    updateRequestContext({
      sessionId,
      platform,
      base: req.headers["x-base"] || decoded.base,
      devicePlatform: req.headers["x-device-platform"] || session.devicePlatform,
      deviceModel: req.headers["x-device-model"] || session.deviceModel,
    });
    next();
  } catch (err) {
    console.error("JWT verification failed:", err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const verifySetupToken = async (req, res, next) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: "Setup token required" });

  try {
    const user = await UserModel.findOne({
      setupToken: { $exists: true },
      setupTokenExpires: { $gt: Date.now() }, // only not expired
    }).select("+setupToken");

    if (!user)
      return res
        .status(400)
        .json({ message: "Activation token expired or invalid" });

    const isValid = await bcrypt.compare(token, user.setupToken);
    if (!isValid)
      return res.status(400).json({ message: "Invalid activation token" });

    req.userRecord = user; // attach user for controller
    next();
  } catch (err) {
    console.error("Setup token verification error:", err);
    res.status(500).json({ message: "Failed to verify setup token" });
  }
};

module.exports = { verifyToken, verifySetupToken };
