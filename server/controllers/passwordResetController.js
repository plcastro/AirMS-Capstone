const crypto = require("crypto");
const bcrypt = require("bcrypt");
const UserModel = require("../models/userModel");
const sendEmail = require("../utilities/sendEmail");
const { auditLog } = require("./logsController");

const TOKEN_EXPIRATION = 60 * 60 * 1000; // 1 hour
const OTP_EXPIRATION = 15 * 60 * 1000; // 15 mins
const MAX_OTP_ATTEMPTS = 5;
const LOCK_DURATION = 30 * 60 * 1000; // 30 mins
const generateOTP = require("../utilities/generateOTP");

// --- Request Password Reset ---
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await UserModel.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate reset token & OTP
    const token = crypto.randomBytes(32).toString("hex");
    const otp = generateOTP();
    const hashedOtp = await bcrypt.hash(otp, 10);

    // Save to user
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + TOKEN_EXPIRATION;
    user.otp = hashedOtp;
    user.otpExpires = Date.now() + OTP_EXPIRATION;
    user.otpAttempts = 0;
    user.otpLockUntil = undefined;

    await user.save();

    await sendEmail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "AirMS Password Reset Request",
      html: `
        <h1>Hello, <strong>${user.firstName}</strong></h1></br>
        <p>Your verification code is: <strong>${otp}</strong></p>
        <p>Use this code in the app to reset your password.</p>
        <p>If you did not request this, ignore this email.</p>
      `,
    });

    await auditLog(`Password reset email sent to ${user.username}`, user._id);

    res.json({ message: "Password reset email and OTP sent.", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// --- Verify OTP ---
const verifyOtp = async (req, res) => {
  try {
    const { token, otp } = req.body;

    const user = await UserModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ message: "Invalid or expired token" });

    if (user.otpLockUntil && user.otpLockUntil > Date.now())
      return res
        .status(403)
        .json({ message: "Too many OTP attempts. Try later." });

    if (!user.otp || !user.otpExpires || user.otpExpires < Date.now())
      return res
        .status(400)
        .json({ message: "OTP expired. Request a new one." });

    const isValidOtp = await bcrypt.compare(otp, user.otp);
    if (!isValidOtp) {
      user.otpAttempts += 1;
      if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
        user.otpLockUntil = Date.now() + LOCK_DURATION;
      }
      await user.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Success: invalidate OTP for security
    user.otpAttempts = 0;
    user.otpLockUntil = undefined;
    await user.save();

    res.json({ message: "OTP verified", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// --- Reset Password ---
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword)
      return res.status(400).json({ message: "New password required" });

    const user = await UserModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ message: "Invalid or expired token" });

    // Save new password
    user.password = await bcrypt.hash(newPassword, 12);

    // Clear token and OTP to prevent reuse
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.otp = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;
    user.otpLockUntil = undefined;

    await user.save();
    await auditLog(
      `Password reset successfully for ${user.username}`,
      user._id,
    );

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { requestPasswordReset, verifyOtp, resetPassword };
