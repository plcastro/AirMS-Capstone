const crypto = require("crypto");
const bcrypt = require("bcrypt");
const UserModel = require("../models/userModel");
const sendEmail = require("../utils/sendEmail");
const { buildOtpEmail } = require("../utils/emailTemplates");
const generateOTP = require("../utils/generateOTP");
const { auditLog } = require("./logsController");
const getAuditActorId = (req, fallbackId = null) =>
  req.user?.id || req.userRecord?._id || fallbackId;
const withActorId = (req, action, fallbackId = null) => {
  const actorId = getAuditActorId(req, fallbackId);
  return {
    actorId,
    action: actorId ? `${action} (actorId: ${actorId})` : action,
  };
};

const TOKEN_EXPIRATION = 60 * 60 * 1000;
const OTP_EXPIRATION = 15 * 60 * 1000;
const MAX_PIN_OTP_ATTEMPTS = 5;
const PIN_OTP_LOCK_TIME = 15 * 60 * 1000;

const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await UserModel.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const otp = generateOTP();

    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + TOKEN_EXPIRATION;
    user.otp = await bcrypt.hash(otp, 10);
    user.otpExpires = Date.now() + OTP_EXPIRATION;

    await user.save();

    const emailMessage = buildOtpEmail({
      title: "Password Reset Request",
      intro:
        "We received a request to reset the password for your AirMS account. Use this one-time code to continue.",
      otp,
      validityMinutes: 15,
      warning:
        "If you did not request this change, ignore this email or contact support if you have concerns.",
    });

    await sendEmail({
      to: user.email,
      subject: "Reset your password",
      ...emailMessage,
    });

    const audit = withActorId(
      req,
      `Password reset requested for ${user.username}`,
      user._id,
    );
    await auditLog(audit.action, audit.actorId);
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// VERIFY
const verifyOtp = async (req, res) => {
  const { token, otp } = req.body;

  const user = await UserModel.findOne({ resetPasswordToken: token });

  if (!user) return res.status(400).json({ message: "Invalid token" });

  if (!user.otpExpires || user.otpExpires < Date.now())
    return res.status(400).json({ message: "OTP expired" });

  const valid = await bcrypt.compare(otp, user.otp);
  if (!valid) return res.status(400).json({ message: "Invalid OTP" });

  res.json({ message: "OTP verified" });
};

// RESET
const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  const user = await UserModel.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  }).select("+password");

  if (!user) return res.status(400).json({ message: "Invalid token" });

  const isCurrentPassword = await bcrypt.compare(newPassword, user.password);
  if (isCurrentPassword) {
    return res
      .status(400)
      .json({ message: "Cannot reuse the same password." });
  }

  user.password = await bcrypt.hash(newPassword, 12);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.otp = undefined;
  user.otpExpires = undefined;

  await user.save();
  const passwordResetAudit = withActorId(
    req,
    `Password reset completed for ${user.username}`,
    user._id,
  );
  await auditLog(passwordResetAudit.action, passwordResetAudit.actorId);

  res.json({ message: "Password reset successful" });
};

// REQUEST
const requestPinReset = async (req, res) => {
  try {
    const { currentPassword } = req.body;
    const { id } = req.params;

    const user = await UserModel.findById(id).select("+password");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.password) {
      return res.status(400).json({ message: "User has no password set" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Incorrect password" });

    const token = crypto.randomBytes(32).toString("hex");
    const otp = generateOTP();

    user.resetPinToken = token;
    user.resetPinExpires = Date.now() + TOKEN_EXPIRATION;
    user.pinOtp = await bcrypt.hash(otp, 10);
    user.pinOtpExpires = Date.now() + OTP_EXPIRATION;
    user.pinOtpVerified = false;
    user.pinOtpAttempts = 0;
    user.pinOtpLockUntil = undefined;
    await user.save();

    const emailMessage = buildOtpEmail({
      title: "PIN Reset Request",
      intro:
        "We received a request to reset the PIN for your AirMS account. Use this one-time code to continue.",
      otp,
      validityMinutes: 15,
      warning:
        "If you did not request this change, ignore this email or contact support if you have concerns.",
    });

    await sendEmail({
      to: user.email,
      subject: "Reset your PIN",
      ...emailMessage,
    });

    const audit = withActorId(
      req,
      `PIN reset requested for ${user.username}`,
      user._id,
    );
    await auditLog(audit.action, audit.actorId);
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// VERIFY PIN OTP
const verifyPinOtp = async (req, res) => {
  const { token, otp } = req.body;
  const normalizedOtp = String(otp || "").trim();

  const user = await UserModel.findOne({ resetPinToken: token });
  if (!user) return res.status(400).json({ message: "Invalid token" });

  if (!user.resetPinExpires || user.resetPinExpires < Date.now())
    return res.status(400).json({ message: "Invalid token" });

  if (!/^\d{6}$/.test(normalizedOtp)) {
    return res.status(400).json({ message: "Enter the complete 6-digit OTP" });
  }

  if (user.pinOtpLockUntil && user.pinOtpLockUntil > Date.now()) {
    const remainingTime = Math.ceil((user.pinOtpLockUntil - Date.now()) / 60000);
    return res.status(403).json({
      message: `Too many invalid OTP attempts. Try again in ${remainingTime} minutes.`,
    });
  }

  if (user.pinOtpExpires < Date.now())
    return res.status(400).json({ message: "OTP expired" });

  const valid = await bcrypt.compare(normalizedOtp, user.pinOtp);
  if (!valid) {
    user.pinOtpAttempts += 1;

    if (user.pinOtpAttempts >= MAX_PIN_OTP_ATTEMPTS) {
      user.pinOtpLockUntil = Date.now() + PIN_OTP_LOCK_TIME;
      await user.save();
      return res.status(403).json({
        message: `Too many invalid OTP attempts. Try again in ${Math.ceil(
          PIN_OTP_LOCK_TIME / 60000,
        )} minutes.`,
      });
    }

    await user.save();
    return res.status(400).json({ message: "Invalid OTP" });
  }

  user.pinOtpAttempts = 0;
  user.pinOtpLockUntil = undefined;
  user.pinOtpVerified = true;
  await user.save();

  res.json({ message: "OTP verified", token: user.resetPinToken });
};

// RESET PIN
const resetPin = async (req, res) => {
  console.log("Reached resetPin");
  console.log(req.headers);
  console.log(req.body);
  const { token, newPin } = req.body;

  const user = await UserModel.findOne({
    resetPinToken: token,
    resetPinExpires: { $gt: Date.now() },
  });

  if (!user) return res.status(400).json({ message: "Invalid token" });

  if (!user.pinOtpVerified) {
    return res.status(400).json({ message: "OTP verification required" });
  }

  if (!/^\d{6}$/.test(String(newPin || ""))) {
    return res.status(400).json({ message: "PIN must be exactly 6 digits" });
  }

  user.pin = await bcrypt.hash(newPin, 12);

  user.resetPinToken = undefined;
  user.resetPinExpires = undefined;
  user.pinOtp = undefined;
  user.pinOtpExpires = undefined;
  user.pinOtpVerified = false;

  await user.save();
  const pinResetAudit = withActorId(
    req,
    `PIN reset completed for ${user.username}`,
    user._id,
  );
  await auditLog(pinResetAudit.action, pinResetAudit.actorId);

  res.json({ message: "PIN reset successful" });
};

module.exports = {
  requestPasswordReset,
  verifyOtp,
  resetPassword,
  requestPinReset,
  verifyPinOtp,
  resetPin,
};
