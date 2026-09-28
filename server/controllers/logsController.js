const UserModel = require("../models/userModel");
const UserLog = require("../models/logsModel");
const UserSession = require("../models/userSessionModel");
const {
  getRequestContext,
  markAuditLogged,
} = require("../middleware/requestContext");
const { publishTypedForRecipients } = require("../utils/realtimeEvents");

const isKnownPlatform = (value) => ["WEB", "MOBILE"].includes(value);
const compactText = (value = "", limit = 160) =>
  String(value || "")
    .trim()
    .slice(0, limit);
const parseCoordinate = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const getDisplayName = (user = {}, fallback = "Unknown") => {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return compactText(fullName || user.displayName || user.username || fallback);
};

const resolveAuditContext = async (context = {}, userId = null) => {
  const resolved = { ...context };

  if (
    isKnownPlatform(resolved.platform) &&
    resolved.sessionId &&
    resolved.devicePlatform &&
    resolved.deviceModel &&
    resolved.locationText
  ) {
    return resolved;
  }

  if (!userId && !resolved.sessionId) {
    return resolved;
  }

  const sessionFilter = resolved.sessionId
    ? { sessionId: resolved.sessionId }
    : { userId };

  const session = await UserSession.findOne(sessionFilter)
    .sort({ isActive: -1, lastActivityAt: -1, loginAt: -1, createdAt: -1 })
    .lean();

  if (!session) {
    return resolved;
  }

  resolved.sessionId = resolved.sessionId || session.sessionId || null;
  resolved.platform = isKnownPlatform(resolved.platform)
    ? resolved.platform
    : session.platform || null;
  resolved.devicePlatform =
    compactText(resolved.devicePlatform) || session.devicePlatform || "";
  resolved.deviceModel =
    compactText(resolved.deviceModel) || session.deviceModel || "";
  resolved.locationText =
    compactText(resolved.locationText, 240) || session.locationText || "";
  resolved.locationLatitude =
    parseCoordinate(resolved.locationLatitude) ?? session.locationLatitude ?? null;
  resolved.locationLongitude =
    parseCoordinate(resolved.locationLongitude) ??
    session.locationLongitude ??
    null;

  return resolved;
};

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const sanitizeActionText = (rawAction, actorNames = []) => {
  if (typeof rawAction !== "string") return rawAction;

  let action = rawAction.trim();

  action = action.replace(/\s*\(actorId:\s*[^)]+\)/gi, "");

  actorNames
    .filter((name) => name && name !== "System" && name !== "Unknown")
    .forEach((name) => {
      const safeUsername = escapeRegex(name);

      action = action.replace(
        new RegExp(`(:\\s*)${safeUsername}\\b`, "gi"),
        "",
      );
      action = action.replace(
        new RegExp(`(for\\s+)${safeUsername}\\b`, "gi"),
        "$1user",
      );
    });

  // Remove API endpoint fragments from stored audit messages.
  action = action
    .replace(/\b(?:GET|POST|PUT|PATCH|DELETE)\s+\/api\/[^\s)]+/gi, "")
    .replace(/\b\/api\/[^\s)]+/gi, "")
    .replace(/\s{2,}/g, " ");

  action = action
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();

  return action;
};

const auditLog = async (
  action,
  userId = null,
  usernameSnapshot = null,
  requestMeta = {},
) => {
  try {
    markAuditLogged();

    let username = usernameSnapshot || "System";
    let firstName = "";
    let lastName = "";
    let displayName = username;
    if (userId) {
      const user = await UserModel.findById(userId).select(
        "username firstName lastName",
      );
      if (user) {
        username = usernameSnapshot || user.username;
        firstName = user.firstName || "";
        lastName = user.lastName || "";
        displayName = getDisplayName(user, username);
      } else if (!usernameSnapshot) {
        username = `Unknown (ID: ${userId})`;
        displayName = username;
      }
    }

    const sanitizedAction = sanitizeActionText(action, [username, displayName]);

    const context = await resolveAuditContext(
      { ...getRequestContext(), ...requestMeta },
      userId,
    );

    const newLog = await UserLog.create({
      action: sanitizedAction,
      performedBy: userId,
      username,
      firstName,
      lastName,
      displayName,
      sessionId: context.sessionId || null,
      platform: context.platform || null,
      ipAddress: context.ipAddress || "",
      userAgent: context.userAgent || "",
      devicePlatform: compactText(context.devicePlatform),
      deviceModel: compactText(context.deviceModel),
      locationText: compactText(context.locationText, 240),
      locationLatitude: parseCoordinate(context.locationLatitude),
      locationLongitude: parseCoordinate(context.locationLongitude),
    });
    publishTypedForRecipients(
      { recipientRoles: ["superadmin"], excludedUsers: userId ? [userId] : [] },
      "logs:new",
      {
        logId: String(newLog._id),
        at: newLog.dateTime || new Date().toISOString(),
        action: sanitizedAction,
      },
    ).catch((error) => {
      console.error("Failed to publish audit log event:", error);
    });

    return newLog;
  } catch (err) {
    console.error("Audit log failed:", err);
  }
};

const getLatestLog = async (req, res) => {
  try {
    const latestLog = await UserLog.findOne({})
      .sort({ dateTime: -1, createdAt: -1 })
      .lean();

    if (!latestLog) {
      return res.status(200).json({});
    }

    return res.status(200).json({
      _id: latestLog._id,
      id: latestLog._id,
      dateTime: latestLog.dateTime,
      actionMade: latestLog.action,
      username: latestLog.displayName || latestLog.username || "Unknown",
      displayName: latestLog.displayName || latestLog.username || "Unknown",
      performedByName: latestLog.displayName || latestLog.username || "Unknown",
      firstName: latestLog.firstName || "",
      lastName: latestLog.lastName || "",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch latest log" });
  }
};

const createAuditLogFromRequest = async (req, res) => {
  try {
    const { action, userId, username } = req.body || {};

    if (!action || typeof action !== "string" || !action.trim()) {
      return res.status(400).json({ message: "Action is required" });
    }

    const actorId = userId || req.user?.id || null;
    const log = await auditLog(action.trim(), actorId, username || null, {
      sessionId: req.headers["x-session-id"] || null,
      platform: req.headers["x-platform"] || null,
      ipAddress: req.ip || req.socket?.remoteAddress || null,
      userAgent: req.headers["user-agent"] || "",
      devicePlatform: req.headers["x-device-platform"] || "",
      deviceModel: req.headers["x-device-model"] || "",
      locationText: req.headers["x-location-text"] || "",
      locationLatitude: req.headers["x-location-latitude"],
      locationLongitude: req.headers["x-location-longitude"],
    });

    return res.status(201).json({
      status: "Ok",
      message: "Audit log created",
      data: log,
    });
  } catch (err) {
    console.error("Failed to create audit log:", err);
    return res.status(500).json({ message: "Failed to create audit log" });
  }
};

const getAllUserLogs = async (req, res) => {
  try {
    const { startDate, endDate, search = "", page = 1, limit = 20 } = req.query;

    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 1000);
    const skip = (safePage - 1) * safeLimit;

    const filter = {};

    if (startDate || endDate) {
      filter.dateTime = {};
      if (startDate) {
        const parsedStartDate = new Date(startDate);
        if (!Number.isNaN(parsedStartDate.getTime())) {
          filter.dateTime.$gte = parsedStartDate;
        }
      }
      if (endDate) {
        const parsedEndDate = new Date(endDate);
        if (!Number.isNaN(parsedEndDate.getTime())) {
          filter.dateTime.$lte = parsedEndDate;
        }
      }
      if (Object.keys(filter.dateTime).length === 0) {
        delete filter.dateTime;
      }
    }

    if (typeof search === "string" && search.trim()) {
      const pattern = new RegExp(search.trim(), "i");
      filter.$or = [
        { action: pattern },
        { username: pattern },
        { firstName: pattern },
        { lastName: pattern },
        { displayName: pattern },
        { devicePlatform: pattern },
        { deviceModel: pattern },
        { locationText: pattern },
      ];
    }

    const [logs, total] = await Promise.all([
      UserLog.find(filter)
        .sort({ dateTime: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      UserLog.countDocuments(filter),
    ]);

    const sessionIds = [
      ...new Set(
        logs
          .filter(
            (log) =>
              log.sessionId &&
              (!isKnownPlatform(log.platform) ||
                !log.devicePlatform ||
                !log.deviceModel ||
                !log.locationText),
          )
          .map((log) => log.sessionId),
      ),
    ];

    const sessionMap =
      sessionIds.length > 0
        ? new Map(
            (
              await UserSession.find({ sessionId: { $in: sessionIds } })
                .select(
                  "sessionId platform devicePlatform deviceModel locationText locationLatitude locationLongitude",
                )
                .lean()
            ).map((session) => [session.sessionId, session]),
          )
        : new Map();

    const userIds = [
      ...new Set(
        logs
          .filter((log) => log.performedBy && !log.displayName)
          .map((log) => String(log.performedBy)),
      ),
    ];
    const userMap =
      userIds.length > 0
        ? new Map(
            (
              await UserModel.find({ _id: { $in: userIds } })
                .select("username firstName lastName")
                .lean()
            ).map((user) => [String(user._id), user]),
          )
        : new Map();

    const data = logs.map((log) => {
      const session = sessionMap.get(log.sessionId);
      const platform = isKnownPlatform(log.platform)
        ? log.platform
        : session?.platform || null;
      const user = log.performedBy ? userMap.get(String(log.performedBy)) : null;
      const displayName =
        log.displayName ||
        getDisplayName(
          {
            firstName: log.firstName || user?.firstName,
            lastName: log.lastName || user?.lastName,
            username: log.username || user?.username,
          },
          "Unknown",
        );
      const devicePlatform =
        compactText(log.devicePlatform) || session?.devicePlatform || "";
      const deviceModel = compactText(log.deviceModel) || session?.deviceModel || "";
      const locationText =
        compactText(log.locationText, 240) || session?.locationText || "";
      const locationLatitude =
        parseCoordinate(log.locationLatitude) ?? session?.locationLatitude ?? null;
      const locationLongitude =
        parseCoordinate(log.locationLongitude) ??
        session?.locationLongitude ??
        null;

      return {
        _id: log._id,
        dateTime: log.dateTime,
        actionMade: log.action,
        username: displayName,
        displayName,
        performedByName: displayName,
        firstName: log.firstName || user?.firstName || "",
        lastName: log.lastName || user?.lastName || "",
        platform,
        devicePlatform,
        deviceModel,
        locationText,
        locationLatitude,
        locationLongitude,
        sessionId: log.sessionId || null,
        ipAddress: log.ipAddress || "",
        userAgent: log.userAgent || "",
      };
    });

    res.status(200).json({
      status: "Ok",
      data,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch logs" });
  }
};

module.exports = {
  auditLog,
  createAuditLogFromRequest,
  getAllUserLogs,
  getLatestLog,
};
