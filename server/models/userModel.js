const mongoose = require("mongoose");
const validator = require("validator");

mongoose.sanitizeFilter = true;

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  username: { type: String, required: true, unique: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    validate: [validator.isEmail, "Invalid email"],
  },
  password: { type: String, required: true, select: false },
  pin: { type: String, default: "", select: false },
  signature: { type: String, default: "" },
  securitySetupCompleted: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["active", "inactive", "deactivated"],
    default: "inactive",
  },
  jobTitle: {
    type: String,
    enum: [
      "Maintenance Manager",
      "Pilot",
      "Admin",
      "Officer-In-Charge",
      "Mechanic",
      "Warehouse Department",
    ],
    default: "Mechanic",
  },
  access: {
    type: String,
    enum: ["Admin", "Superuser", "User"],
    default: "User",
  },
  tempPasswordExpires: Date,
  licenseNo: { type: String, unique: true, trim: true },
  image: { type: String, default: "" },
  dateCreated: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: null },
  mobilePushDevices: {
    type: [
      {
        deviceId: { type: String, required: true },
        expoPushToken: { type: String, required: true },
        platform: { type: String, default: "unknown" },
        lastSeenAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  },

  // --- PASSWORD RESET ---
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  otp: String,
  otpExpires: Date,
  otpAttempts: { type: Number, default: 0 },
  otpLockUntil: Date,

  // --- PIN RESET ---
  resetPinToken: String,
  resetPinExpires: Date,
  pinOtp: String,
  pinOtpExpires: Date,
  pinOtpAttempts: { type: Number, default: 0 },
  pinOtpLockUntil: Date,

  // --- Account lockout for security ---
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  isLocked: { type: Boolean, default: false },
});

module.exports = mongoose.model("User", userSchema);
