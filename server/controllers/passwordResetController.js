const crypto = require("crypto");
const bcrypt = require("bcrypt");
const User = require("../models/userModel");
const sendEmail = require("../utilities/sendEmail");
const { auditLog } = require("./logsController");

const requestPasswordReset = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  const token = crypto.randomBytes(32).toString("hex");

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  user.resetPasswordToken = token;
  user.resetPasswordExpires = Date.now() + 3600000;
  user.otp = otp;
  await user.save();

  const resetURL = `http://localhost:8081/reset-password/${token}`;

  await sendEmail({
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "AirMS Password Reset Request",
    html: `
      <p>Hello, ${user.firstName}</p>
      <p>You requested a password reset.</p>
      <p>Your verification code is: <strong>${otp}</strong></p>
      <p>Click here to reset: <a href="${resetURL}">Reset Password</a></p>
      <p>This code and link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  });

  await auditLog(`Password reset email sent to ${user.username}`, user._id);
  res.json({ message: "Password reset email and OTP sent." });
};

const resetPassword = async (req, res) => {
  const { token } = req.params;
  try {
    const { newPassword, otp } = req.body;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const updatedUser = await User.findOneAndUpdate(
      {
        resetPasswordToken: token,
        otp: otp,
        resetPasswordExpires: { $gt: Date.now() },
      },
      {
        password: hashedPassword,
        resetPasswordToken: undefined,
        resetPasswordExpires: undefined,
        otp: undefined,
      },
      { new: true },
    );

    if (!updatedUser)
      return res.status(400).json({ message: "Invalid or expired token/OTP" });

    res.json({
      message: "Password has been reset successfully.",
      user: updatedUser,
    });

    await auditLog(`Password has been reset successfully`, updatedUser._id);
  } catch (err) {
    console.error("Reset password error:", err);
    await auditLog(`Password reset failed for token: ${token}`);
    res.status(500).json({ message: "Failed to reset password" });
  }
};

module.exports = { resetPassword, requestPasswordReset };
