const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");
const {
  buildActivationEmail,
  buildOtpEmail,
} = require("../utils/emailTemplates");
const validator = require("validator");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { del } = require("@vercel/blob");
const UserModel = require("../models/userModel");
const UserSession = require("../models/userSessionModel");
const RefreshToken = require("../models/refreshTokenModel");
const { auditLog } = require("./logsController");
const generateUniqueUsername = require("../utils/generateUniqueUsername");
const generateOTP = require("../utils/generateOTP");
const {
  normalizePlatform,
  normalizeBase,
} = require("../middleware/requestContext");
const {
  resetLoginRateLimitForIdentifiers,
  resetOtpRateLimitForValues,
} = require("../middleware/rateLimiter");
const WEB_URL = process.env.WEB_URL;

const buildLoginPortalUrl = (baseUrl) => {
  if (!baseUrl) return "";

  const trimmedUrl = String(baseUrl).trim();
  if (!trimmedUrl) return "";
  if (/\.apk(?:[?#].*)?$/i.test(trimmedUrl)) return trimmedUrl;
  if (/\/login\/?$/i.test(trimmedUrl)) return trimmedUrl;

  return `${trimmedUrl.replace(/\/+$/, "")}/login`;
};

const getAuditActorId = (req, fallbackId = null) =>
  req.user?.id || req.userRecord?._id || fallbackId;
const withActorId = (req, action, fallbackId = null) => {
  const actorId = getAuditActorId(req, fallbackId);
  return {
    actorId,
    action: actorId ? `${action} (actorId: ${actorId})` : action,
  };
};

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 30 * 60 * 1000; // 30 minutes
const TEMP_PASSWORD_VALIDITY_MS = 60 * 60 * 1000; // 1 hour
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (non-persistent)
const REMEMBER_ME_REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MOBILE_REFRESH_TOKEN_TTL_MS = 10 * 365 * 24 * 60 * 60 * 1000; // 10 years; logout/revocation still ends mobile sessions
const REFRESH_TOKEN_RECORD_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days after expiry/revocation
const LOGIN_OTP_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutes
const TRUSTED_DEVICE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SESSION_IDLE_LIMIT_MS = 15 * 60 * 1000;
const CLIENT_ACTIVITY_GRACE_MS = 30 * 1000;
const ROLES_REQUIRING_LICENSE = new Set([
  "maintenance manager",
  "pilot",
  "mechanic",
  "officer-in-charge",
]);

const parseString = (value) => (typeof value === "string" ? value.trim() : "");
const requiresLicenseNo = (jobTitle = "") =>
  ROLES_REQUIRING_LICENSE.has(parseString(jobTitle).toLowerCase());
const getDuplicateKeyMessage = (error) => {
  if (error?.code !== 11000) {
    return null;
  }

  if (error?.keyPattern?.email) {
    return "Email already registered";
  }
  if (error?.keyPattern?.username) {
    return "Username already taken";
  }
  if (error?.keyPattern?.licenseNo) {
    return "License no. already in use";
  }

  return "Duplicate user information";
};

const hashRefreshToken = (token = "") =>
  crypto.createHash("sha256").update(String(token)).digest("hex");
const hashTrustedDeviceToken = (token = "") =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

const getRefreshTokenTtlMs = (isPersistent, platform = "") =>
  normalizePlatform(platform) === "MOBILE"
    ? MOBILE_REFRESH_TOKEN_TTL_MS
    : isPersistent
      ? REMEMBER_ME_REFRESH_TOKEN_TTL_MS
      : REFRESH_TOKEN_TTL_MS;

const getSessionIdleLimitMs = () => SESSION_IDLE_LIMIT_MS;
const isMobilePlatform = (platform = "") =>
  normalizePlatform(platform) === "MOBILE";

const getRefreshTokenCleanupDate = (expiresAt) =>
  new Date(new Date(expiresAt).getTime() + REFRESH_TOKEN_RECORD_RETENTION_MS);

const getRevokedRefreshTokenCleanupDate = () =>
  new Date(Date.now() + REFRESH_TOKEN_RECORD_RETENTION_MS);

const issueRefreshToken = (userId, isPersistent = false, platform = "") => {
  const jti = crypto.randomUUID();
  const expiresInSeconds = Math.floor(
    getRefreshTokenTtlMs(isPersistent, platform) / 1000,
  );
  const token = jwt.sign(
    { id: userId, type: "refresh" },
    process.env.REFRESH_SECRET,
    {
      expiresIn: expiresInSeconds,
      jwtid: jti,
    },
  );

  return { token, jti };
};

const setRefreshTokenCookie = (
  res,
  refreshToken,
  isPersistent,
  platform = "",
) => {
  const refreshCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    secure: true,
  };

  if (isPersistent) {
    refreshCookieOptions.maxAge = getRefreshTokenTtlMs(true, platform);
  }

  res.cookie("refreshToken", refreshToken, refreshCookieOptions);
};

const storeRefreshToken = async ({
  userId,
  refreshToken,
  jti,
  isPersistent,
  platform,
  req,
}) => {
  const tokenHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(
    Date.now() + getRefreshTokenTtlMs(Boolean(isPersistent), platform),
  );
  return RefreshToken.create({
    userId,
    tokenHash,
    jti,
    expiresAt,
    cleanupAt: getRefreshTokenCleanupDate(expiresAt),
    isPersistent: Boolean(isPersistent),
    ipAddress: req.ip || req.socket?.remoteAddress || "",
    userAgent: req.headers["user-agent"] || "",
  });
};

const revokeRefreshTokenByHash = async (
  tokenHash,
  reason,
  replacedByTokenHash = null,
) =>
  RefreshToken.findOneAndUpdate(
    { tokenHash, revokedAt: null },
    {
      revokedAt: new Date(),
      revokedReason: reason,
      replacedByTokenHash,
      cleanupAt: getRevokedRefreshTokenCleanupDate(),
    },
    { returnDocument: "after" },
  );

const revokeAllUserRefreshTokens = async (userId, reason) => {
  if (!userId) return;
  await RefreshToken.updateMany(
    { userId, revokedAt: null },
    {
      revokedAt: new Date(),
      revokedReason: reason,
      cleanupAt: getRevokedRefreshTokenCleanupDate(),
    },
  );
};

const invalidateUserSessions = async (userId, reason) => {
  if (!userId) return;

  const now = new Date();
  await Promise.all([
    UserSession.updateMany(
      { userId, isActive: true },
      { isActive: false, logoutAt: now, lastActivityAt: now },
    ),
    revokeAllUserRefreshTokens(userId, reason),
  ]);
};

const deletePreviousRefreshTokens = async (userId, keepTokenHash) => {
  if (!userId || !keepTokenHash) return;
  await RefreshToken.updateMany(
    {
      userId,
      tokenHash: { $ne: keepTokenHash },
      revokedAt: null,
    },
    {
      revokedAt: new Date(),
      revokedReason: "Superseded by newer refresh token",
      cleanupAt: getRevokedRefreshTokenCleanupDate(),
    },
  );
};

const createUserSession = async (req, userId, platform) => {
  const sessionId = req.headers["x-session-id"] || crypto.randomUUID();
  const normalizedPlatform =
    normalizePlatform(platform || req.headers["x-platform"]) || "UNKNOWN";
  const normalizedBase = normalizeBase(req.headers["x-base"] || req.body?.base);

  await UserSession.create({
    userId,
    sessionId,
    platform: normalizedPlatform,
    base: normalizedBase,
    ipAddress: req.ip || req.socket?.remoteAddress || "",
    userAgent: req.headers["user-agent"] || "",
    isActive: true,
  });

  return {
    sessionId,
    platform: normalizedPlatform,
    base: normalizedBase,
  };
};

const sendActivationCredentialsEmail = async ({
  to,
  firstName,
  username,
  tempPassword,
  jobTitle,
  isResend = false,
}) => {
  const portalUrlWeb = buildLoginPortalUrl(WEB_URL);
  const subject = isResend
    ? "AirMS Account Activation - Resend"
    : "Welcome to AirMS - Your Account Details";
  const email = buildActivationEmail({
    firstName,
    username,
    tempPassword,
    jobTitle,
    portalUrlWeb,
    isResend,
  });

  await sendEmail({
    to,
    subject,
    ...email,
  });
};

const resendActivationForUser = async (user) => {
  const newTempPassword = Math.random().toString(36).slice(-8);
  const newExpiry = Date.now() + TEMP_PASSWORD_VALIDITY_MS;

  user.password = await bcrypt.hash(newTempPassword, 12);
  user.status = "inactive";
  user.invitationStatus = "pending";
  user.invitationSentAt = new Date();
  user.invitationExpiresAt = new Date(newExpiry);
  user.invitationClaimedAt = null;
  user.tempPasswordExpires = newExpiry;
  await user.save();

  await sendActivationCredentialsEmail({
    to: user.email,
    firstName: user.firstName,
    username: user.username,
    tempPassword: newTempPassword,
    jobTitle: user.jobTitle,
    isResend: true,
  });
};

const getAllUsers = async (req, res) => {
  try {
    const users = await UserModel.find({});
    res.status(200).json({ status: "Ok", data: users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAssignableUsers = async (req, res) => {
  try {
    const users = await UserModel.find({
      status: "active",
      jobTitle: { $regex: /^mechanic$/i },
    })
      .select("firstName lastName jobTitle status image")
      .lean();

    const userIds = users.map((user) => user._id);
    const activeSince = new Date(Date.now() - SESSION_IDLE_LIMIT_MS);
    const activeSessions = await UserSession.find({
      userId: { $in: userIds },
      isActive: true,
      lastActivityAt: { $gte: activeSince },
    })
      .sort({ lastActivityAt: -1, loginAt: -1 })
      .lean();

    const latestSessionByUserId = new Map();
    activeSessions.forEach((session) => {
      const userId = String(session.userId);
      if (!latestSessionByUserId.has(userId)) {
        latestSessionByUserId.set(userId, session);
      }
    });

    const usersWithLiveStatus = users.map((user) => {
      const activeSession = latestSessionByUserId.get(String(user._id));
      const isOnline = Boolean(activeSession);

      return {
        ...user,
        isOnline,
        online: isOnline,
        platform: isOnline ? activeSession.platform || "unknown" : "offline",
        lastActivityAt: activeSession?.lastActivityAt || null,
      };
    });

    res.status(200).json({ status: "Ok", data: usersWithLiveStatus });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const maskEmail = (email = "") => {
  const [localPart = "", domain = ""] = String(email).split("@");
  if (!localPart || !domain) return email;
  if (localPart.length <= 2) {
    return `${localPart[0] || "*"}*@${domain}`;
  }
  return `${localPart[0]}${"*".repeat(localPart.length - 2)}${localPart.slice(-1)}@${domain}`;
};

const buildTrustedDeviceToken = () => crypto.randomBytes(48).toString("hex");

const findValidTrustedDevice = (user, rawToken) => {
  if (!rawToken || !Array.isArray(user?.trustedDevices)) return null;
  const tokenHash = hashTrustedDeviceToken(rawToken);
  const now = Date.now();
  return user.trustedDevices.find(
    (device) =>
      device?.tokenHash === tokenHash &&
      !device?.revokedAt &&
      new Date(device?.expiresAt || 0).getTime() > now,
  );
};

const sendLoginOtpEmail = async (to, otp) => {
  const email = buildOtpEmail({
    title: "AirMS Login Verification",
    intro: "Use this one-time code to complete your sign in.",
    otp,
    validityMinutes: 10,
    warning:
      "If you did not attempt to log in, please contact your administrator.",
  });

  await sendEmail({
    to,
    subject: "Your AirMS Login Verification Code",
    ...email,
  });
};

const buildLoginSuccessPayload = async ({
  req,
  res,
  user,
  loginPlatform,
  rememberMe,
  loginBase,
}) => {
  user.failedLoginAttempts = 0;
  user.isLocked = false;
  user.lockUntil = undefined;
  user.lastLogin = new Date();
  user.isOnline = true;
  user.platform = loginPlatform.toLowerCase();
  user.lastSeenAt = new Date();
  user.loginOtp = undefined;
  user.loginOtpExpires = undefined;
  user.loginOtpToken = undefined;
  user.loginOtpAttempts = 0;
  user.loginOtpLockUntil = undefined;
  await user.save();

  const session = await createUserSession(req, user._id, loginPlatform);

  const token = jwt.sign(
    {
      id: user._id,
      username: user.username,
      email: user.email,
      jobTitle: user.jobTitle,
      access: user.access,
      licenseNo: user.licenseNo,
      sessionId: session.sessionId,
      platform: session.platform,
      base: session.base,
    },
    process.env.JWT_SECRET,
    { expiresIn: "15m" },
  );

  const usePersistentRefreshCookie = Boolean(rememberMe);
  const { token: refreshToken, jti } = issueRefreshToken(
    user._id.toString(),
    usePersistentRefreshCookie,
    loginPlatform,
  );
  await storeRefreshToken({
    userId: user._id,
    refreshToken,
    jti,
    isPersistent: usePersistentRefreshCookie,
    platform: loginPlatform,
    req,
  });
  await deletePreviousRefreshTokens(user._id, hashRefreshToken(refreshToken));
  setRefreshTokenCookie(
    res,
    refreshToken,
    usePersistentRefreshCookie,
    loginPlatform,
  );

  auditLog(
    `User log in: ${user.username} (actorId: ${user._id})`,
    user._id,
    user.username,
    {
      sessionId: session.sessionId,
      platform: session.platform,
      base: session.base,
      ipAddress: req.ip || req.socket?.remoteAddress || "",
      userAgent: req.headers["user-agent"] || "",
    },
  ).catch((logError) => {
    console.error("Login audit log failed:", logError);
  });

  return {
    message: "Login successful",
    token,
    refreshToken: loginPlatform === "MOBILE" ? refreshToken : undefined,
    sessionId: session.sessionId,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      jobTitle: user.jobTitle,
      access: user.access,
      licenseNo: user.licenseNo,
      status: user.status,
      image: user.image,
      // signature: user.signature,
      securitySetupCompleted: user.securitySetupCompleted,
      lastLogin: user.lastLogin,
      isOnline: user.isOnline,
      platform: user.platform,
      base: session.base || loginBase,
      sessionId: session.sessionId,
      lastSeenAt: user.lastSeenAt,
    },
  };
};

const loginUser = async (req, res) => {
  try {
    if (!process.env.JWT_SECRET || !process.env.REFRESH_SECRET) {
      console.error(
        "Auth configuration error: JWT_SECRET or REFRESH_SECRET is missing",
      );
      return res.status(500).json({
        message: "Server authentication configuration error.",
      });
    }

    let { identifier, password, client, rememberMe, trustedDeviceToken } =
      req.body;

    if (typeof identifier !== "string" || typeof password !== "string") {
      return res.status(400).json({
        message: "Invalid input type",
      });
    }

    identifier = identifier.trim();
    password = password.trim();
    const normalizedClient =
      typeof client === "string" ? client.trim().toLowerCase() : "";
    const loginPlatform =
      normalizedClient === "web"
        ? "WEB"
        : normalizedClient === "mobile"
          ? "MOBILE"
          : "UNKNOWN";
    const loginBase = normalizeBase(req.headers["x-base"] || req.body?.base);

    if (!identifier || !password) {
      return res
        .status(400)
        .json({ message: "Username/email and password required" });
    }
    if (loginBase === "UNKNOWN") {
      return res.status(400).json({
        message: "Please select where you are logging in from",
      });
    }
    if (/[${}]/.test(identifier) || /[$]/.test(password)) {
      return res.status(400).json({ message: "Invalid input" });
    }

    const user = await UserModel.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    }).select("+password +tempPasswordExpires ");

    if (!user) {
      return res.status(401).json({ message: "Account does not exist" });
    }

    if (user.status === "deactivated") {
      return res
        .status(403)
        .json({
          message: "This account is deactivated. Please contact support",
        });
    }

    // Check lock
    const currentTime = Date.now();
    if (user.isLocked) {
      if (user.lockUntil && currentTime > user.lockUntil) {
        user.isLocked = false;
        user.failedLoginAttempts = 0;
        user.lockUntil = undefined;
        await user.save();
      } else {
        const remainingTime = Math.round(
          (user.lockUntil - currentTime) / 60000,
        );
        return res.status(403).json({
          message: `Account locked. Try again in ${remainingTime} minutes.`,
        });
      }
    }

    // Handle inactive users separately
    if (user.status === "inactive") {
      if (user.invitationStatus === "revoked") {
        return res.status(403).json({
          message: "Invitation revoked. Contact your administrator.",
        });
      }

      if (!user.tempPasswordExpires || user.tempPasswordExpires < Date.now()) {
        if (user.invitationStatus !== "expired") {
          user.invitationStatus = "expired";
          await user.save();
        }
        return res.status(401).json({
          message: "Temporary password expired. Resend activation.",
        });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid temporary password" });
      }
      if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET not set in environment variables");
      }

      const setupToken = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "1h" },
      );

      return res.status(200).json({
        message: "Temporary login successful. Proceed to security setup.",
        requireSetup: true,
        user: {
          id: user._id,
          email: user.email,
          status: user.status,
          setupToken,
        },
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.isLocked = true;
        user.lockUntil = Date.now() + LOCK_TIME;
        await user.save();
        return res.status(403).json({
          message: `Account locked. Try again in ${Math.round(
            LOCK_TIME / 60000,
          )} minutes.`,
        });
      }
      await user.save();
      return res
        .status(401)
        .json({ message: "Invalid username/email or password" });
    }

    const inboundTrustedDeviceToken =
      trustedDeviceToken || req.headers["x-trusted-device-token"];
    const validTrustedDevice = findValidTrustedDevice(
      user,
      inboundTrustedDeviceToken,
    );
    if (validTrustedDevice) {
      validTrustedDevice.lastUsedAt = new Date();
      await user.save();

      const trustedPayload = await buildLoginSuccessPayload({
        req,
        res,
        user,
        loginPlatform,
        rememberMe: Boolean(rememberMe),
        loginBase,
      });

      return res.status(200).json({
        ...trustedPayload,
        trustedDeviceAccepted: true,
      });
    }

    const otp = generateOTP();
    console.log(`[DEV_LOGIN_OTP] ${user.email}: ${otp}`);
    const loginOtpToken = crypto.randomBytes(32).toString("hex");
    user.loginOtp = await bcrypt.hash(otp, 10);
    user.loginOtpExpires = Date.now() + LOGIN_OTP_EXPIRATION_MS;
    user.loginOtpToken = loginOtpToken;
    user.loginOtpAttempts = 0;
    user.loginOtpLockUntil = undefined;
    await user.save();

    try {
      await sendLoginOtpEmail(user.email, otp);
    } catch (otpError) {
      console.error("sendLoginOtpEmail error:", otpError);
      return res.status(503).json({
        message:
          "Unable to send verification code email. Please contact support.",
      });
    }

    return res.status(200).json({
      requireLoginOtp: true,
      message: "Verification code sent to your email",
      verification: {
        token: loginOtpToken,
        email: user.email,
        maskedEmail: maskEmail(user.email),
        expiresInSeconds: Math.floor(LOGIN_OTP_EXPIRATION_MS / 1000),
      },
      loginContext: {
        loginPlatform,
        rememberMe: Boolean(rememberMe),
        base: loginBase,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    const isDev =
      String(process.env.NODE_ENV || "").toLowerCase() === "development";
    return res.status(500).json({
      message:
        isDev && err?.message ? `Login failed: ${err.message}` : "Login failed",
    });
  }
};

const verifyLoginOtp = async (req, res) => {
  try {
    if (!process.env.JWT_SECRET || !process.env.REFRESH_SECRET) {
      return res.status(500).json({ message: "Server configuration error." });
    }

    const {
      token,
      otp,
      rememberMe,
      client,
      base,
      trustDevice,
      trustedDeviceLabel,
    } = req.body;
    if (!token || !otp) {
      return res.status(400).json({ message: "Token and OTP are required" });
    }
    const normalizedOtp = String(otp || "").trim();
    if (!/^\d{6}$/.test(normalizedOtp)) {
      return res
        .status(400)
        .json({ message: "Enter the complete 6-digit OTP" });
    }

    const user = await UserModel.findOne({ loginOtpToken: token }).select(
      "+loginOtp +loginOtpExpires +loginOtpToken",
    );
    if (!user || !user.loginOtp || !user.loginOtpExpires) {
      return res.status(400).json({ message: "Invalid verification request" });
    }

    if (user.loginOtpExpires < Date.now()) {
      return res
        .status(400)
        .json({ message: "OTP expired. Please log in again." });
    }

    const valid = await bcrypt.compare(normalizedOtp, user.loginOtp);
    if (!valid) {
      user.loginOtpAttempts = Number(user.loginOtpAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const normalizedClient =
      typeof client === "string" ? client.trim().toLowerCase() : "";
    const loginPlatform =
      normalizedClient === "web"
        ? "WEB"
        : normalizedClient === "mobile"
          ? "MOBILE"
          : "UNKNOWN";
    const loginBase = normalizeBase(req.headers["x-base"] || base);

    const payload = await buildLoginSuccessPayload({
      req,
      res,
      user,
      loginPlatform,
      rememberMe: Boolean(rememberMe),
      loginBase,
    });

    if (trustDevice) {
      const rawTrustedDeviceToken = buildTrustedDeviceToken();
      const trustedDeviceTokenHash = hashTrustedDeviceToken(
        rawTrustedDeviceToken,
      );

      user.trustedDevices = (user.trustedDevices || []).filter(
        (device) =>
          !device?.revokedAt && new Date(device?.expiresAt || 0) > new Date(),
      );
      user.trustedDevices.push({
        tokenHash: trustedDeviceTokenHash,
        label: String(trustedDeviceLabel || "").slice(0, 120),
        platform: loginPlatform.toLowerCase(),
        createdAt: new Date(),
        lastUsedAt: new Date(),
        expiresAt: new Date(Date.now() + TRUSTED_DEVICE_TTL_MS),
      });
      await user.save();

      return res.status(200).json({
        ...payload,
        trustedDeviceToken: rawTrustedDeviceToken,
        trustedDeviceExpiresAt: new Date(
          Date.now() + TRUSTED_DEVICE_TTL_MS,
        ).toISOString(),
      });
    }

    return res.status(200).json(payload);
  } catch (err) {
    console.error("verifyLoginOtp error:", err);
    return res.status(500).json({ message: "OTP verification failed" });
  }
};

const resendLoginOtp = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Token is required" });

    const user = await UserModel.findOne({ loginOtpToken: token }).select(
      "+loginOtpToken",
    );
    if (!user) {
      return res.status(400).json({ message: "Invalid verification request" });
    }

    const otp = generateOTP();
    user.loginOtp = await bcrypt.hash(otp, 10);
    user.loginOtpExpires = Date.now() + LOGIN_OTP_EXPIRATION_MS;
    user.loginOtpAttempts = 0;
    await user.save();

    await sendLoginOtpEmail(user.email, otp);
    return res.status(200).json({
      message: "A new verification code was sent",
      verification: {
        token: user.loginOtpToken,
        email: user.email,
        maskedEmail: maskEmail(user.email),
        expiresInSeconds: Math.floor(LOGIN_OTP_EXPIRATION_MS / 1000),
      },
    });
  } catch (err) {
    console.error("resendLoginOtp error:", err);
    return res.status(500).json({ message: "Failed to resend OTP" });
  }
};

const unlockUser = async (req, res) => {
  try {
    const id = req.params.id || req.body.id;
    const user = await UserModel.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const previousLoginOtpToken = user.loginOtpToken;

    user.failedLoginAttempts = 0;
    user.isLocked = false;
    user.lockUntil = undefined;
    user.loginOtp = undefined;
    user.loginOtpExpires = undefined;
    user.loginOtpToken = undefined;
    user.loginOtpAttempts = 0;
    user.loginOtpLockUntil = undefined;

    await user.save();
    resetLoginRateLimitForIdentifiers([user.username, user.email]);
    resetOtpRateLimitForValues([previousLoginOtpToken, user.email]);
    const audit = withActorId(req, `User unlocked: ${user.username}`, user._id);
    await auditLog(audit.action, audit.actorId);

    res.json({
      message: "Account unlocked successfully",
      user,
      data: user,
    });
  } catch (err) {
    console.error("unlockUser error:", err);
    res.status(500).json({ message: err.message || "Failed to unlock user" });
  }
};

const refreshToken = async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;
  if (!incomingRefreshToken) {
    return res
      .status(401)
      .json({ message: "No refresh token provided (cookie or body missing)" });
  }

  try {
    const payload = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_SECRET,
    );
    const incomingTokenHash = hashRefreshToken(incomingRefreshToken);
    const tokenRecord = await RefreshToken.findOne({
      tokenHash: incomingTokenHash,
      userId: payload.id,
    });

    if (
      !tokenRecord ||
      tokenRecord.revokedAt ||
      tokenRecord.expiresAt <= new Date()
    ) {
      if (tokenRecord?.revokedAt && tokenRecord?.replacedByTokenHash) {
        return res.status(403).json({ message: "Refresh token already rotated" });
      }

      await revokeAllUserRefreshTokens(
        payload.id,
        "Refresh token replay/reuse detected during rotation",
      );
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "None",
        secure: true,
      });
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    const user = await UserModel.findById(payload.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const sessionId = req.headers["x-session-id"] || null;
    if (!sessionId) {
      return res.status(401).json({ message: "Session context missing" });
    }

    let activeSession = await UserSession.findOne({
      userId: user._id,
      sessionId,
    });

    if (!activeSession) {
      return res.status(401).json({ message: "Session is no longer active" });
    }

    if (!activeSession.isActive) {
      if (!tokenRecord.isPersistent) {
        return res.status(401).json({ message: "Session is no longer active" });
      }

      activeSession = await UserSession.findOneAndUpdate(
        { userId: user._id, sessionId },
        { isActive: true, lastActivityAt: new Date(), logoutAt: null },
        { new: true },
      );
    }

    const requestPlatform = normalizePlatform(
      req.headers["x-platform"] || activeSession.platform || payload.platform,
    );
    const now = Date.now();
    if (!isMobilePlatform(requestPlatform)) {
      const sessionIdleLimitMs = getSessionIdleLimitMs(requestPlatform);
      const clientActiveAt = Number(req.headers["x-client-active-at"]);
      const hasRecentClientActivity =
        Number.isFinite(clientActiveAt) &&
        clientActiveAt <= now + CLIENT_ACTIVITY_GRACE_MS &&
        now - clientActiveAt <= sessionIdleLimitMs;
      const lastActivityAt = new Date(
        activeSession.lastActivityAt || activeSession.loginAt || now,
      ).getTime();
      const effectiveLastActivityAt = hasRecentClientActivity
        ? Math.max(lastActivityAt, clientActiveAt)
        : lastActivityAt;
      if (
        !tokenRecord.isPersistent &&
        now - effectiveLastActivityAt > sessionIdleLimitMs
      ) {
        await UserSession.findOneAndUpdate(
          { userId: user._id, sessionId, isActive: true },
          { isActive: false, logoutAt: new Date(), lastActivityAt: new Date() },
        );
        return res
          .status(401)
          .json({ message: "Session timed out due to inactivity" });
      }
    }

    await UserSession.findOneAndUpdate(
      { userId: user._id, sessionId, isActive: true },
      { lastActivityAt: new Date() },
    );

    if (user.status === "deactivated") {
      return res.status(403).json({ message: "Account deactivated" });
    }

    const newAccessToken = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        jobTitle: user.jobTitle,
        access: user.access,
        licenseNo: user.licenseNo,
        sessionId: req.headers["x-session-id"] || payload.sessionId || null,
        platform: req.headers["x-platform"] || payload.platform || "UNKNOWN",
        base: req.headers["x-base"] || payload.base || "UNKNOWN",
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    const { token: newRefreshToken, jti } = issueRefreshToken(
      user._id.toString(),
      Boolean(tokenRecord.isPersistent),
      requestPlatform,
    );
    const newTokenHash = hashRefreshToken(newRefreshToken);

    await revokeRefreshTokenByHash(
      incomingTokenHash,
      "Rotated by refresh endpoint",
      newTokenHash,
    );

    await storeRefreshToken({
      userId: user._id,
      refreshToken: newRefreshToken,
      jti,
      isPersistent: tokenRecord.isPersistent,
      platform: requestPlatform,
      req,
    });
    await deletePreviousRefreshTokens(user._id, newTokenHash);

    setRefreshTokenCookie(
      res,
      newRefreshToken,
      tokenRecord.isPersistent,
      requestPlatform,
    );
    const isMobileClient =
      String(req.headers["x-platform"] || "").toUpperCase() === "MOBILE";
    res.json({
      token: newAccessToken,
      refreshToken: isMobileClient ? newRefreshToken : undefined,
    });
  } catch {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
      secure: true,
    });
    res.status(403).json({ message: "Invalid refresh token" });
  }
};

const updateSessionPreference = async (req, res) => {
  try {
    const userId = req.user?.id;
    const sessionId =
      req.headers["x-session-id"] || req.user?.sessionId || null;
    const {
      rememberMe,
      revokePersistentTokens = false,
      refreshToken,
    } = req.body || {};

    if (!userId || !sessionId) {
      return res.status(401).json({ message: "Session context missing" });
    }
    if (typeof rememberMe !== "boolean") {
      return res.status(400).json({ message: "rememberMe must be boolean" });
    }

    const activeSession = await UserSession.findOne({
      userId,
      sessionId,
      isActive: true,
    });
    if (!activeSession) {
      return res.status(401).json({ message: "Session is no longer active" });
    }

    const incomingRefreshToken =
      req.cookies?.refreshToken ||
      refreshToken ||
      req.body?.refreshToken ||
      null;
    const incomingTokenHash = incomingRefreshToken
      ? hashRefreshToken(incomingRefreshToken)
      : null;

    let tokenRecord = null;
    if (incomingTokenHash) {
      tokenRecord = await RefreshToken.findOne({
        tokenHash: incomingTokenHash,
        userId,
        revokedAt: null,
      });
    }

    if (Boolean(revokePersistentTokens)) {
      const persistentFilter = {
        userId,
        isPersistent: true,
        revokedAt: null,
      };
      if (incomingTokenHash) {
        persistentFilter.tokenHash = { $ne: incomingTokenHash };
      }
      await RefreshToken.updateMany(persistentFilter, {
        revokedAt: new Date(),
        revokedReason: "Remember me disabled",
        cleanupAt: getRevokedRefreshTokenCleanupDate(),
      });
    }

    let nextRefreshToken;
    let rotated = false;
    const desiredPersistent = Boolean(rememberMe);
    const shouldRotate =
      !tokenRecord || Boolean(tokenRecord.isPersistent) !== desiredPersistent;

    if (shouldRotate) {
      const requestPlatform = normalizePlatform(req.headers["x-platform"]);
      const { token: issuedRefreshToken, jti } = issueRefreshToken(
        userId.toString(),
        desiredPersistent,
        requestPlatform,
      );
      await storeRefreshToken({
        userId,
        refreshToken: issuedRefreshToken,
        jti,
        isPersistent: desiredPersistent,
        platform: requestPlatform,
        req,
      });
      await deletePreviousRefreshTokens(
        userId,
        hashRefreshToken(issuedRefreshToken),
      );

      if (incomingTokenHash) {
        await revokeRefreshTokenByHash(
          incomingTokenHash,
          "Session preference updated",
          hashRefreshToken(issuedRefreshToken),
        );
      }

      setRefreshTokenCookie(
        res,
        issuedRefreshToken,
        desiredPersistent,
        requestPlatform,
      );
      nextRefreshToken = issuedRefreshToken;
      rotated = true;
    } else if (incomingRefreshToken) {
      setRefreshTokenCookie(
        res,
        incomingRefreshToken,
        desiredPersistent,
        normalizePlatform(req.headers["x-platform"]),
      );
    }

    const isMobileClient =
      String(req.headers["x-platform"] || "").toUpperCase() === "MOBILE";

    return res.status(200).json({
      message: "Session preference updated",
      rememberMe: desiredPersistent,
      sessionId,
      rotated,
      refreshToken: isMobileClient
        ? nextRefreshToken || incomingRefreshToken
        : undefined,
    });
  } catch (error) {
    console.error("updateSessionPreference error:", error);
    return res
      .status(500)
      .json({ message: "Failed to update session preference" });
  }
};

const deactivateSessionById = async (userId, sessionId) => {
  if (!userId || !sessionId) return;
  await UserSession.findOneAndUpdate(
    { userId, sessionId, isActive: true },
    { isActive: false, logoutAt: new Date(), lastActivityAt: new Date() },
  );
};

const logoutUser = async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies?.refreshToken || req.body?.refreshToken;
    let revokedRefreshToken = null;
    if (incomingRefreshToken) {
      revokedRefreshToken = await revokeRefreshTokenByHash(
        hashRefreshToken(incomingRefreshToken),
        "User logout",
      );
    }

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      await deactivateSessionById(
        revokedRefreshToken?.userId,
        req.headers["x-session-id"],
      );
      res.clearCookie("refreshToken", {
        httpOnly: true,
        sameSite: "None",
        secure: true,
      });
      return res.status(200).json({ message: "Logged out successfully" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err?.name !== "TokenExpiredError") {
        await deactivateSessionById(
          revokedRefreshToken?.userId,
          req.headers["x-session-id"],
        );
        res.clearCookie("refreshToken", {
          httpOnly: true,
          sameSite: "None",
          secure: true,
        });
        return res.status(200).json({ message: "Logged out successfully" });
      }
      decoded = jwt.verify(token, process.env.JWT_SECRET, {
        ignoreExpiration: true,
      });
    }

    await UserModel.findByIdAndUpdate(decoded.id, {
      isOnline: false,
      lastSeenAt: new Date(),
    });

    const incomingSessionId = req.headers["x-session-id"];
    if (incomingSessionId) {
      await UserSession.findOneAndUpdate(
        { userId: decoded.id, sessionId: incomingSessionId, isActive: true },
        { isActive: false, logoutAt: new Date(), lastActivityAt: new Date() },
      );
    } else {
      await UserSession.findOneAndUpdate(
        { userId: decoded.id, isActive: true },
        { isActive: false, logoutAt: new Date(), lastActivityAt: new Date() },
        { sort: { loginAt: -1 } },
      );
    }

    await auditLog(
      `User log out: ${decoded.username || decoded.id} (actorId: ${decoded.id})`,
      decoded.id,
      decoded.username || null,
    );

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
      secure: true,
    });

    res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    await auditLog("Logout failed", null);
    res.status(500).json({ message: "Logout failed" });
  }
};

const registerMobilePushDevice = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { deviceId, expoPushToken, fcmToken, platform } = req.body;
    const pushToken = fcmToken || expoPushToken;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!deviceId || !pushToken) {
      return res
        .status(400)
        .json({ message: "deviceId and push token are required" });
    }

    await UserModel.updateMany(
      {
        $or: [
          { "mobilePushDevices.deviceId": deviceId },
          { "mobilePushDevices.fcmToken": pushToken },
          { "mobilePushDevices.expoPushToken": pushToken },
        ],
      },
      {
        $pull: {
          mobilePushDevices: {
            $or: [
              { deviceId },
              { fcmToken: pushToken },
              { expoPushToken: pushToken },
            ],
          },
        },
      },
    );

    await UserModel.findByIdAndUpdate(
      userId,
      {
        $push: {
          mobilePushDevices: {
            deviceId,
            fcmToken: pushToken,
            platform: platform || "unknown",
            lastSeenAt: new Date(),
          },
        },
      },
      { returnDocument: "after" },
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("registerMobilePushDevice error:", error);
    res.status(500).json({ message: "Failed to register push device" });
  }
};

const createUser = async (req, res) => {
  try {
    let { firstName, lastName, email, jobTitle, access, licenseNo } = req.body;

    firstName = parseString(firstName);
    lastName = parseString(lastName);
    email = parseString(email);
    jobTitle = parseString(jobTitle);
    access = parseString(access);
    licenseNo = parseString(licenseNo);

    if (!firstName || !lastName || !email || !jobTitle) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const requiresLicense = requiresLicenseNo(jobTitle);

    if (requiresLicense && !licenseNo) {
      return res.status(400).json({ message: "License no. is required" });
    }

    const existingEmail = await UserModel.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ message: "Email already registered" });
    }

    if (requiresLicense) {
      const existingLicense = await UserModel.findOne({ licenseNo });
      if (existingLicense) {
        return res.status(409).json({ message: "License no. already in use" });
      }
    }

    const username = await generateUniqueUsername(firstName, lastName);

    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    const tempPasswordExpires = Date.now() + TEMP_PASSWORD_VALIDITY_MS;

    let imagePath = "";
    if (req.file) {
      imagePath = req.file.savedPath || `/uploads/${req.file.filename}`;
    }

    const newUser = await UserModel.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email,
      username: username.trim(),
      password: hashedPassword,
      tempPasswordExpires,
      invitationStatus: "pending",
      invitationSentAt: new Date(),
      invitationExpiresAt: new Date(tempPasswordExpires),
      status: "inactive",
      image: imagePath,
      jobTitle,
      access,
      licenseNo: requiresLicense ? licenseNo : undefined,
    });

    await sendActivationCredentialsEmail({
      to: email,
      firstName,
      username,
      tempPassword,
      jobTitle,
      isResend: false,
    });

    const audit = withActorId(
      req,
      `User created: ${username}, email sent successfully`,
      newUser._id,
    );
    await auditLog(audit.action, audit.actorId);

    res.status(201).json({
      message: "User created successfully",
      data: newUser,
    });
  } catch (err) {
    console.error("Error in createUser:", err);
    const duplicateKeyMessage = getDuplicateKeyMessage(err);
    if (duplicateKeyMessage) {
      return res.status(409).json({ message: duplicateKeyMessage });
    }

    res.status(500).json({
      message: "User creation failed (email not sent)",
    });
  }
};

const completeSecuritySetup = async (req, res) => {
  try {
    let { setupToken, newPassword } = req.body;

    if (!setupToken) {
      return res.status(400).json({ message: "Setup token required" });
    }
    setupToken = setupToken.trim();
    newPassword = newPassword.trim();

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters long" });
    }
    const passwordRegex = /^[A-Za-z0-9]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and contain only letters and numbers",
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not set in environment variables");
    }

    let decoded;
    try {
      decoded = jwt.verify(setupToken, process.env.JWT_SECRET);
    } catch (err) {
      return res
        .status(401)
        .json({ message: "Invalid or expired setup token" });
    }

    const user = await UserModel.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.status !== "inactive") {
      return res.status(400).json({ message: "Setup already completed" });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.status = "active";
    user.securitySetupCompleted = true;
    user.tempPasswordExpires = undefined;
    user.invitationStatus = "claimed";
    user.invitationClaimedAt = new Date();

    await user.save();
    const audit = withActorId(
      req,
      `Security setup completed for ${user.username}`,
      user._id,
    );
    await auditLog(audit.action, audit.actorId);

    return res.status(200).json({
      message: "Security setup completed successfully",
    });
  } catch (err) {
    console.error("Security setup error:", err);
    return res
      .status(500)
      .json({ message: "Server error during security setup" });
  }
};

const checkUsernameExists = async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res
        .status(400)
        .json({ exists: false, message: "Username is required" });
    }

    const existingUser = await UserModel.findOne({
      username: username.trim(),
    }).select("_id");

    return res.status(200).json({
      exists: !!existingUser,
    });
  } catch (err) {
    console.error("Username check error:", err);
    return res.status(500).json({ exists: false, message: "Server error" });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    let { firstName, lastName, email, username, access, jobTitle, licenseNo } =
      req.body;

    firstName = parseString(firstName);
    lastName = parseString(lastName);
    email = parseString(email);
    username = parseString(username);
    access = parseString(access);
    jobTitle = parseString(jobTitle);
    licenseNo = parseString(licenseNo);

    if (
      !firstName ||
      !lastName ||
      !email ||
      !username ||
      !access ||
      !jobTitle
    ) {
      return res.status(400).json({ message: "Employee information required" });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const allowedAccess = new Set(["Superadmin", "Superuser", "User"]);
    if (!allowedAccess.has(access)) {
      return res.status(400).json({ message: "Invalid access level" });
    }

    const requiresLicense = requiresLicenseNo(jobTitle);
    if (requiresLicense && !licenseNo) {
      return res.status(400).json({ message: "License no. is required" });
    }

    const user = await UserModel.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isSelfUpdate = String(req.user?.id || "") === String(user._id);
    const roleOrAccessChanged =
      jobTitle !== user.jobTitle || access !== user.access;

    if (isSelfUpdate && roleOrAccessChanged) {
      return res.status(403).json({
        message: "You cannot change your own role or access level.",
      });
    }

    const existingEmail = await UserModel.findOne({
      email,
      _id: { $ne: id },
    });
    if (existingEmail) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const existingUsername = await UserModel.findOne({
      username,
      _id: { $ne: id },
    });
    if (existingUsername) {
      return res.status(409).json({ message: "Username already taken" });
    }

    if (requiresLicense && licenseNo) {
      const existingLicense = await UserModel.findOne({
        licenseNo,
        _id: { $ne: id },
      });
      if (existingLicense) {
        return res.status(409).json({ message: "License no. already in use" });
      }
    }

    const changedFields = [];

    if (firstName !== user.firstName) changedFields.push("First Name");
    if (lastName !== user.lastName) changedFields.push("Last Name");
    if (email !== user.email) changedFields.push("Email");
    if (username !== user.username) changedFields.push("Username");
    if (jobTitle !== user.jobTitle) changedFields.push("Job Title");
    if (access !== user.access) changedFields.push("Access Level");

    if (requiresLicense && licenseNo !== (user.licenseNo || "")) {
      changedFields.push("License Number");
    }

    if (!requiresLicense && user.licenseNo) {
      changedFields.push("License Number");
    }

    const updateData = {
      $set: { firstName, lastName, email, username, access, jobTitle },
    };

    if (requiresLicense) {
      updateData.$set.licenseNo = licenseNo;
    } else {
      updateData.$unset = { licenseNo: "" };
    }

    const updatedUser = await UserModel.findByIdAndUpdate(id, updateData, {
      returnDocument: "after",
      runValidators: true,
    });
    // console.log(updatedUser.username);

    if (roleOrAccessChanged) {
      await invalidateUserSessions(
        updatedUser._id,
        "User role/access changed by administrator",
      );
    }

    if (changedFields.length > 0) {
      const audit = withActorId(
        req,
        `User account updated for username: ${updatedUser.username}. Fields updated: ${changedFields.join(", ")}`,
        updatedUser._id,
      );
      await auditLog(audit.action, audit.actorId);
    } else {
      const audit = withActorId(
        req,
        `User update attempted but no changes were detected. Username: ${updatedUser.username}`,
        updatedUser._id,
      );
      await auditLog(audit.action, audit.actorId);
    }

    res.status(200).json({
      message: "User updated successfully",
      user: updatedUser,
      data: updatedUser,
    });
  } catch (err) {
    console.error("Error updating user:", err);
    await auditLog("Failed to update user", null);
    const duplicateKeyMessage = getDuplicateKeyMessage(err);
    if (duplicateKeyMessage) {
      return res.status(409).json({ message: duplicateKeyMessage });
    }

    res.status(500).json({ message: err.message || "Failed to update user" });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    let { firstName, lastName } = req.body;

    if (typeof firstName !== "string" || typeof lastName !== "string") {
      return res.status(400).json({
        message: "Invalid input type",
      });
    }
    firstName = firstName.trim();
    lastName = lastName.trim();

    if (!firstName || !lastName) {
      return res
        .status(400)
        .json({ message: "First and Last name is required" });
    }

    const user = await UserModel.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const updateData = {};
    if (firstName && firstName.trim() !== user.firstName)
      updateData.firstName = firstName.trim();
    if (lastName && lastName.trim() !== user.lastName)
      updateData.lastName = lastName.trim();

    if (Object.keys(updateData).length === 0) {
      return res
        .status(200)
        .json({ message: "No name changes provided", user });
    }

    const updatedUser = await UserModel.findByIdAndUpdate(id, updateData, {
      returnDocument: "after",
    });

    const audit = withActorId(
      req,
      `User name updated: ${updatedUser.username}`,
      updatedUser._id,
    );
    await auditLog(audit.action, audit.actorId);

    res
      .status(200)
      .json({ message: "Name updated successfully", user: updatedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update name" });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const user = await UserModel.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const updatedUser = await UserModel.findByIdAndUpdate(
      id,
      { status },
      { returnDocument: "after" },
    );

    const audit = withActorId(
      req,
      `User status updated: ${user.username}. Old: ${user.status}, New: ${status}`,
      updatedUser._id,
    );
    await auditLog(audit.action, audit.actorId);

    res
      .status(200)
      .json({ message: "User status updated successfully", user: updatedUser });
  } catch (err) {
    console.error("Error updating user status:", err);
    await auditLog("Failed to update user status", null);
    res
      .status(500)
      .json({ message: err.message || "Failed to update user status" });
  }
};
const deleteFile = async (filePath) => {
  // 1. Exit if the user doesn't have an image (prevents the 'null' deletion crash)
  if (!filePath || typeof filePath !== "string" || filePath === "null") return;

  try {
    if (filePath.startsWith("http")) {
      if (!process.env.BLOB_READ_WRITE_TOKEN) return;
      await del(filePath, { token: process.env.BLOB_READ_WRITE_TOKEN });
      return;
    }

    // 2. Normalize the path (remove leading slash)
    const cleanPath = filePath.startsWith("/")
      ? filePath.substring(1)
      : filePath;

    // 3. Always resolve from the PROJECT ROOT (process.cwd())
    const fullPath = path.resolve(process.cwd(), cleanPath);

    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
      console.log("Successfully deleted old image:", fullPath);
    }
  } catch (err) {
    // We log but don't throw, so the rest of the update-user-image can finish
    console.error("FileSystem Cleanup Error:", err.message);
  }
};

const updateUserImage = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await UserModel.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    let newImagePath = user.image;
    const shouldRemoveImage =
      req.method === "DELETE" ||
      req.body?.removeImage === true ||
      req.body?.image === null ||
      req.body?.image === "null";
    if (req.file) {
      if (
        user.image &&
        typeof user.image === "string" &&
        user.image !== "null"
      ) {
        await deleteFile(user.image);
      }

      newImagePath = req.file.savedPath || `/uploads/${req.file.filename}`;
    } else if (shouldRemoveImage) {
      if (user.image && typeof user.image === "string") {
        await deleteFile(user.image);
      }
      // Keep image as a string field to avoid validation/casting issues.
      newImagePath = "";
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      id,
      { $set: { image: newImagePath } },
      { returnDocument: "after", runValidators: true },
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    try {
      const audit = withActorId(
        req,
        newImagePath
          ? `User image updated: ${updatedUser.username}`
          : `User image removed: ${updatedUser.username}`,
        updatedUser._id,
      );
      await auditLog(audit.action, audit.actorId);
    } catch (auditErr) {
      console.error("Image update audit log failed:", auditErr);
    }

    res.status(200).json({
      message: newImagePath ? "Avatar updated" : "Avatar removed",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Update Image Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    let { currentPassword, newPassword } = req.body;
    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string"
    ) {
      return res.status(400).json({
        message: "Invalid input type",
      });
    }

    currentPassword = currentPassword.trim();
    newPassword = newPassword.trim();

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Both current and new passwords are required." });
    }

    if (!id) {
      return res.status(400).json({ message: "User ID is required." });
    }

    const user = await UserModel.findById(id).select("+password");
    if (!user) return res.status(404).json({ message: "User not found." });

    if (!user.password) {
      return res.status(400).json({ message: "User has no password set." });
    }

    const isCurrentAndNewMatch = await bcrypt.compare(
      newPassword,
      user.password,
    );
    if (currentPassword === newPassword || isCurrentAndNewMatch) {
      return res
        .status(400)
        .json({ message: "Cannot reuse the same password." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Current password is incorrect." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await UserModel.updateOne({ _id: id }, { password: hashedPassword });
    const audit = withActorId(
      req,
      `Password updated for ${user.username}`,
      user._id,
    );
    await auditLog(audit.action, audit.actorId);

    res.status(200).json({ message: "Password updated successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
};

const updatePIN = async (req, res) => {
  try {
    let { currentPin, newPin } = req.body;
    if (!currentPin || !newPin)
      return res.status(400).json({ message: "PIN is required" });

    currentPin = String(currentPin).trim();
    newPin = String(newPin).trim();

    if (!/^\d{6}$/.test(currentPin) || !/^\d{6}$/.test(newPin)) {
      return res.status(400).json({ message: "PIN must be exactly 6 digits." });
    }

    const user = await UserModel.findById(req.params.id).select("+pin");

    if (!user.pin) {
      return res.status(400).json({ message: "User has no PIN set." });
    }
    const isSamePin = await bcrypt.compare(newPin, user.pin);
    if (currentPin === newPin || isSamePin) {
      return res.status(400).json({ message: "Cannot reuse the same PIN." });
    }

    const isMatch = await bcrypt.compare(currentPin, user.pin);

    if (!isMatch) {
      return res.status(401).json({ message: "Current PIN is incorrect." });
    }

    const hashedPIN = await bcrypt.hash(newPin, 12);

    await UserModel.updateOne({ _id: req.params.id }, { pin: hashedPIN });
    const audit = withActorId(
      req,
      `PIN updated for ${user.username}`,
      user._id,
    );
    await auditLog(audit.action, audit.actorId);
    res.status(200).json({ message: "PIN updated", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const verifyPIN = async (req, res) => {
  try {
    const pin = String(req.body?.pin || "").trim();

    if (!pin) {
      return res.status(400).json({ message: "PIN is required" });
    }
    if (!/^\d{6}$/.test(pin)) {
      return res.status(400).json({ message: "PIN must be exactly 6 digits." });
    }

    const user = await UserModel.findById(req.params.id).select("+pin");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.pin) {
      return res.status(400).json({ message: "User has no PIN set." });
    }

    const isMatch = await bcrypt.compare(pin, user.pin);

    if (!isMatch) {
      return res.status(401).json({ message: "PIN is incorrect." });
    }

    res.status(200).json({ message: "PIN verified" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// const updateSignature = async (req, res) => {
//   try {
//     const user = await UserModel.findById(req.params.id);
//     if (!user) return res.status(404).json({ message: "User not found" });
//
//     if (user.signature) {
//       return res.status(400).json({
//         message: "Signature specimen has already been uploaded.",
//       });
//     }
//
//     const signature = req.file?.savedPath || req.body.signature;
//     if (!signature) {
//       return res.status(400).json({ message: "Signature is required" });
//     }
//
//     const updatedUser = await UserModel.findByIdAndUpdate(
//       req.params.id,
//       { signature },
//       { returnDocument: "after" },
//     );
//
//     const audit = withActorId(
//       req,
//       `Signature updated for ${updatedUser.username}`,
//       updatedUser._id,
//     );
//     await auditLog(audit.action, audit.actorId);
//
//     res.status(200).json({ message: "Signature updated", user: updatedUser });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

const activateUser = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const pin = String(req.body?.pin || "").trim();

    if (!token || !newPassword || !pin) {
      return res
        .status(400)
        .json({ message: "Token, new password, and PIN is required" });
    }
    if (!/^\d{6}$/.test(pin)) {
      return res.status(400).json({ message: "PIN must be exactly 6 digits." });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res
        .status(401)
        .json({ message: "Setup token invalid or expired" });
    }

    const user = await UserModel.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.status === "active")
      return res.status(400).json({ message: "Account already active" });

    user.password = await bcrypt.hash(newPassword, 12);
    user.pin = await bcrypt.hash(pin, 12);
    user.status = "active";
    user.securitySetupCompleted = true;
    user.tempPasswordExpires = undefined;
    user.invitationStatus = "claimed";
    user.invitationClaimedAt = new Date();
    await user.save();

    const audit = withActorId(
      req,
      "User account activated successfully",
      user._id,
    );
    await auditLog(audit.action, audit.actorId);

    res.status(200).json({ message: "Account activated successfully" });
  } catch (err) {
    console.error("activateUser error:", err);
    res.status(500).json({ message: "Activation failed" });
  }
};

const resendActivation = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const user = await UserModel.findOne({ email: email.trim() });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.status === "active")
      return res.status(400).json({ message: "Account is already active" });

    await resendActivationForUser(user);

    const audit = withActorId(req, "Activation email resent", user._id);
    await auditLog(audit.action, audit.actorId);
    res.status(200).json({ message: "Activation email resent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to resend activation" });
  }
};

const resendActivationByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await UserModel.findById(id);

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.status === "active")
      return res.status(400).json({ message: "Account is already active" });

    await resendActivationForUser(user);

    const audit = withActorId(
      req,
      `Activation email resent by superadmin for ${user.username}`,
      user._id,
    );
    await auditLog(audit.action, audit.actorId);

    return res.status(200).json({ message: "Activation email resent" });
  } catch (err) {
    console.error("resendActivationByAdmin error:", err);
    return res.status(500).json({ message: "Failed to resend activation" });
  }
};

const extendInvitationExpiry = async (req, res) => {
  try {
    const { id } = req.params;
    const requestedHours = Number(req.body?.hours);
    const hours =
      Number.isFinite(requestedHours) && requestedHours > 0
        ? requestedHours
        : 24;

    const user = await UserModel.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.status !== "inactive") {
      return res.status(400).json({
        message: "Only inactive users can have invitation expiry extended",
      });
    }

    const newExpiry = Date.now() + hours * 60 * 60 * 1000;
    user.tempPasswordExpires = newExpiry;
    user.invitationExpiresAt = new Date(newExpiry);
    user.invitationStatus = "pending";
    await user.save();

    const audit = withActorId(
      req,
      `Invitation expiry extended for ${user.username} by ${hours} hour(s)`,
      user._id,
    );
    await auditLog(audit.action, audit.actorId);

    return res.status(200).json({
      message: "Invitation expiry extended",
      invitationExpiresAt: user.invitationExpiresAt,
      invitationStatus: user.invitationStatus,
    });
  } catch (err) {
    console.error("extendInvitationExpiry error:", err);
    return res
      .status(500)
      .json({ message: "Failed to extend invitation expiry" });
  }
};

const revokeInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await UserModel.findById(id);

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.status === "active") {
      return res.status(400).json({
        message: "Cannot revoke invitation for an active user",
      });
    }

    user.invitationStatus = "revoked";
    user.tempPasswordExpires = undefined;
    user.invitationExpiresAt = null;
    await user.save();

    const audit = withActorId(
      req,
      `Invitation revoked for ${user.username}`,
      user._id,
    );
    await auditLog(audit.action, audit.actorId);

    return res.status(200).json({ message: "Invitation revoked" });
  } catch (err) {
    console.error("revokeInvitation error:", err);
    return res.status(500).json({ message: "Failed to revoke invitation" });
  }
};

const revokeTrustedDevice = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { token } = req.body;
    if (!userId || !token) {
      return res.status(400).json({ message: "User and token are required" });
    }

    const tokenHash = hashTrustedDeviceToken(token);
    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const match = (user.trustedDevices || []).find(
      (device) => device.tokenHash === tokenHash && !device.revokedAt,
    );
    if (!match) {
      return res
        .status(404)
        .json({ message: "Trusted device token not found or already revoked" });
    }

    match.revokedAt = new Date();
    await user.save();
    return res.status(200).json({ message: "Trusted device revoked" });
  } catch (error) {
    console.error("revokeTrustedDevice error:", error);
    return res.status(500).json({ message: "Failed to revoke trusted device" });
  }
};

const revokeAllTrustedDevices = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(400).json({ message: "User is required" });
    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.trustedDevices = (user.trustedDevices || []).map((device) => ({
      ...device.toObject(),
      revokedAt: device.revokedAt || new Date(),
    }));
    await user.save();
    return res.status(200).json({ message: "All trusted devices revoked" });
  } catch (error) {
    console.error("revokeAllTrustedDevices error:", error);
    return res
      .status(500)
      .json({ message: "Failed to revoke all trusted devices" });
  }
};

module.exports = {
  loginUser,
  verifyLoginOtp,
  resendLoginOtp,
  refreshToken,
  updateSessionPreference,
  unlockUser,
  logoutUser,
  registerMobilePushDevice,
  createUser,
  checkUsernameExists,
  updateUser,
  getAllUsers,
  getAssignableUsers,
  updateUserStatus,
  updateUserProfile,
  updatePassword,
  updatePIN,
  verifyPIN,
  updateUserImage,
  // updateSignature,
  completeSecuritySetup,
  activateUser,
  resendActivation,
  resendActivationByAdmin,
  extendInvitationExpiry,
  revokeInvitation,
  revokeTrustedDevice,
  revokeAllTrustedDevices,
};
