const UserModel = require("../models/userModel");
const UserLog = require("../models/logsModel");
const { getRequestContext } = require("../middleware/requestContext");

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const sanitizeActionText = (rawAction, username) => {
  if (typeof rawAction !== "string") return rawAction;

  let action = rawAction.trim();

  action = action.replace(/\s*\(actorId:\s*[^)]+\)/gi, "");

  if (username && username !== "System" && username !== "Unknown") {
    const safeUsername = escapeRegex(username);

    action = action.replace(new RegExp(`(:\\s*)${safeUsername}\\b`, "gi"), "");
    action = action.replace(
      new RegExp(`(for\\s+)${safeUsername}\\b`, "gi"),
      "$1user",
    );
  }

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
    let username = usernameSnapshot || "System";
    if (userId) {
      if (!usernameSnapshot) {
        const user = await UserModel.findById(userId).select("username");
        if (user) {
          username = user.username;
        } else {
          username = `Unknown (ID: ${userId})`;
        }
      }
    }

    const sanitizedAction = sanitizeActionText(action, username);

    const context = { ...getRequestContext(), ...requestMeta };

    const newLog = await UserLog.create({
      action: sanitizedAction,
      performedBy: userId,
      username,
      sessionId: context.sessionId || null,
      platform: context.platform || "UNKNOWN",
      base: context.base || "UNKNOWN",
      ipAddress: context.ipAddress || "",
      userAgent: context.userAgent || "",
    });

    return newLog;
  } catch (err) {
    console.error("Audit log failed:", err);
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
      platform: req.headers["x-platform"] || "UNKNOWN",
      base: req.headers["x-base"] || "UNKNOWN",
      ipAddress: req.ip || req.socket?.remoteAddress || null,
      userAgent: req.headers["user-agent"] || "",
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
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 200);
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
      filter.$or = [{ action: pattern }, { username: pattern }];
    }

    const [logs, total] = await Promise.all([
      UserLog.find(filter).sort({ dateTime: -1 }).skip(skip).limit(safeLimit),
      UserLog.countDocuments(filter),
    ]);

    const data = logs.map((log) => ({
      _id: log._id,
      dateTime: log.dateTime,
      actionMade: log.action,
      username: log.username || "Unknown",
      platform: log.platform || "UNKNOWN",
      base: log.base || "UNKNOWN",
      sessionId: log.sessionId || null,
      ipAddress: log.ipAddress || "",
      userAgent: log.userAgent || "",
    }));

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
};
