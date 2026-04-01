const crypto = require("crypto");
const bcrypt = require("bcrypt");
const UserModel = require("../models/userModel");
const sendEmail = require("../utilities/sendEmail");
const generateOTP = require("../utilities/generateOTP");

const TOKEN_EXPIRATION = 60 * 60 * 1000;
const OTP_EXPIRATION = 15 * 60 * 1000;

const requestPasswordReset = async (req, res) => {
  try {
    const { email, id } = req.body;

    const query = id
      ? { _id: id, email: email.toLowerCase() }
      : { email: email.toLowerCase() };
    const user = await UserModel.findOne(query);

    if (!user) {
      return res.status(404).json({
        message: id ? "Email does not match this account." : "User not found.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const otp = generateOTP();

    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + TOKEN_EXPIRATION;
    user.otp = await bcrypt.hash(otp, 10);
    user.otpExpires = Date.now() + OTP_EXPIRATION;

    await user.save();

    await sendEmail({
      to: user.email,
      subject: "Reset your password",
      html: `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p>Hello,</p>
      <p>We received a request to reset the password for your account. Use the following One-Time Password (OTP) to proceed:</p>
      
      <div style="background: #f4f4f4; padding: 20px; text-align: center; border-radius: 8px;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #007bff;">${otp}</span>
      </div>

      <p style="margin-top: 25px;">This code is valid for <b>15 minutes</b>. If you did not request this change, please ignore this email or contact support if you have concerns.</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #888;">This is an automated message, please do not reply.</p>
    </div>
  `,
    });

    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// VERIFY
const verifyOtp = async (req, res) => {
  const { token, otp } = req.body;

  const user = await UserModel.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) return res.status(400).json({ message: "Invalid token" });

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
  });

  if (!user) return res.status(400).json({ message: "Invalid token" });

  user.password = await bcrypt.hash(newPassword, 12);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.otp = undefined;
  user.otpExpires = undefined;

  await user.save();

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
    await user.save();

    await sendEmail({
      to: user.email,
      subject: "Reset your PIN",
      html: `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
      <h2 style="color: #333;">PIN Reset Request</h2>
      <p>Hello,</p>
      <p>We received a request to reset the PIN for your account. Use the following One-Time Password (OTP) to proceed:</p>
      
      <div style="background: #f4f4f4; padding: 20px; text-align: center; border-radius: 8px;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #007bff;">${otp}</span>
      </div>

      <p style="margin-top: 25px;">This code is valid for <b>15 minutes</b>. If you did not request this change, please ignore this email or contact support if you have concerns.</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #888;">This is an automated message, please do not reply.</p>
    </div>
  `,
    });

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// VERIFY PIN OTP
const verifyPinOtp = async (req, res) => {
  const { token, otp } = req.body;

  const user = await UserModel.findOne({ resetPinToken: token });
  if (!user) return res.status(400).json({ message: "Invalid token" });

  if (user.pinOtpExpires < Date.now())
    return res.status(400).json({ message: "OTP expired" });

  const valid = await bcrypt.compare(otp, user.pinOtp);
  if (!valid) return res.status(400).json({ message: "Invalid OTP" });

  res.json({ message: "OTP verified", token: user.resetPinToken });
};

// RESET PIN
const resetPin = async (req, res) => {
  const { token, newPin } = req.body;

  const user = await UserModel.findOne({
    resetPinToken: token,
    resetPinExpires: { $gt: Date.now() },
  });

  if (!user) return res.status(400).json({ message: "Invalid token" });

  user.pin = await bcrypt.hash(newPin, 12);

  user.resetPinToken = undefined;
  user.resetPinExpires = undefined;
  user.pinOtp = undefined;
  user.pinOtpExpires = undefined;

  await user.save();

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
