const crypto = require("crypto");
const bcrypt = require("bcrypt");
const UserModel = require("../models/userModel");
const sendEmail = require("../utilities/sendEmail");
const generateOTP = require("../utilities/generateOTP");

const TOKEN_EXPIRATION = 60 * 60 * 1000;
const OTP_EXPIRATION = 15 * 60 * 1000;

// ---------------- PASSWORD ----------------

// REQUEST
const requestPasswordReset = async (req, res) => {
  try {
    const { email, id } = req.body;
    const user = await UserModel.findOne({ _id: id });

    if (!user)
      return res.status(404).json({ message: "User ID does not exists!" });

    if (user.email !== email)
      return res.status(400).json({ message: "Email does not match account" });

    const token = crypto.randomBytes(32).toString("hex");
    const otp = generateOTP();

    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + TOKEN_EXPIRATION;
    user.otp = await bcrypt.hash(otp, 10);
    user.otpExpires = Date.now() + OTP_EXPIRATION;

    await user.save();

    await sendEmail({
      to: user.email,
      subject: "Password Reset OTP",
      html: `<p>Your OTP: <b>${otp}</b></p>`,
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

// ---------------- PIN ----------------

// REQUEST
const requestPinReset = async (req, res) => {
  const { email, id } = req.body;
  const user = await UserModel.findOne({ _id: id });

  if (!user)
    return res.status(404).json({ message: "User ID does not exists!" });

  if (user.email !== email)
    return res.status(404).json({ message: "Email is not registered!" });

  const token = crypto.randomBytes(32).toString("hex");
  const otp = generateOTP();

  user.resetPinToken = token;
  user.resetPinExpires = Date.now() + TOKEN_EXPIRATION;
  user.pinOtp = await bcrypt.hash(otp, 10);
  user.pinOtpExpires = Date.now() + OTP_EXPIRATION;

  await user.save();

  await sendEmail({
    to: user.email,
    subject: "PIN Reset OTP",
    html: `<p>Your OTP: <b>${otp}</b></p>`,
  });

  res.json({ token });
};

// VERIFY PIN OTP
const verifyPinOtp = async (req, res) => {
  const { token, otp } = req.body;

  const user = await UserModel.findOne({
    resetPinToken: token,
    resetPinExpires: { $gt: Date.now() },
  });

  if (!user) return res.status(400).json({ message: "Invalid token" });

  const valid = await bcrypt.compare(otp, user.pinOtp);
  if (!valid) return res.status(400).json({ message: "Invalid OTP" });

  res.json({ message: "OTP verified" });
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
