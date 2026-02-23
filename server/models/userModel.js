const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");

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
  status: {
    type: String,
    enum: ["active", "inactive", "deactivated"],
    default: "inactive",
  },
  position: {
    type: String,
    enum: ["Head of Maintenance", "Pilot", "Admin", "Manager", "Mechanic"],
    default: "Mechanic",
  },
  access: {
    type: String,
    enum: ["Admin", "Superuser", "User"],
    default: "User",
  },
  tempPassword: { type: String, select: false },
  image: { type: String, default: "" },
  dateCreated: { type: Date, default: Date.now },

  // Security setup token
  setupToken: { type: String, select: false },
  setupTokenExpires: Date,

  // --- PASSWORD RESET / OTP ---
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  otp: String,
  otpExpires: Date,
  otpAttempts: { type: Number, default: 0 },
  otpLockUntil: Date,
});

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

const User = mongoose.model("users", userSchema);
module.exports = User;
