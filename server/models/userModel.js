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
      "Superadmin",
      "Officer-In-Charge",
      "Mechanic",
      "Warehouse Staff",
    ],
    default: "Mechanic",
  },
  access: {
    type: String,
    enum: ["Superadmin", "Superuser", "User"],
    default: "User",
  },
  tempPasswordExpires: Date,
  invitationStatus: {
    type: String,
    enum: ["pending", "expired", "claimed", "revoked"],
    default: "pending",
  },
  invitationSentAt: { type: Date, default: Date.now },
  invitationExpiresAt: { type: Date, default: null },
  invitationClaimedAt: { type: Date, default: null },
  licenseNo: { type: String, unique: true, trim: true },
  image: { type: String, default: "" },
  dateCreated: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: null },
  isOnline: { type: Boolean, default: false },
  platform: {
    type: String,
    enum: ["web", "mobile", "unknown"],
    default: "unknown",
  },
  lastSeenAt: { type: Date, default: null },
  mobilePushDevices: {
    type: [
      {
        deviceId: { type: String, required: true },
        fcmToken: { type: String, required: true },
        platform: { type: String, default: "unknown" },
        lastSeenAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  },
  trustedDevices: {
    type: [
      {
        tokenHash: { type: String, required: true },
        label: { type: String, default: "" },
        platform: { type: String, default: "unknown" },
        createdAt: { type: Date, default: Date.now },
        lastUsedAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true },
        revokedAt: { type: Date, default: null },
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
  loginOtp: String,
  loginOtpExpires: Date,
  loginOtpToken: String,
  loginOtpAttempts: { type: Number, default: 0 },
  loginOtpLockUntil: Date,

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

userSchema.pre("validate", function sanitizeMobilePushDevices() {
  if (!Array.isArray(this.mobilePushDevices)) {
    return;
  }

  this.mobilePushDevices = this.mobilePushDevices.filter((device) => {
    const hasDeviceId = Boolean(String(device?.deviceId || "").trim());
    const hasFcmToken = Boolean(String(device?.fcmToken || "").trim());
    return hasDeviceId && hasFcmToken;
  });
});

module.exports = mongoose.model("User", userSchema);
