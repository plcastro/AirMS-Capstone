const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");
mongoose.sanitizeFilter = true;

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, "Please enter your first name."],
  },
  lastName: { type: String, required: [true, "Please enter your last name."] },
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  email: {
    type: String,
    unique: true,
    validate: [validator.isEmail, "Please enter a valid email."],
    required: [true, "Please enter your email."],
  },
  dateCreated: {
    type: Date,
    default: Date.now,
  },
  position: {
    type: String,
    enum: ["Head of Maintenance", "Pilot", "Admin", "Manager", "Mechanic"],
    default: "Mechanic",
    required: [true, "Please select user's position."],
  },
  password: { type: String, required: [true, "Please enter a password."] },
  status: {
    type: String,
    enum: ["active", "inactive", "deactivated"],
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
  access: {
    type: String,
    enum: ["Admin", "Superuser", "User"],
    default: "User",
  },
  tempPassword: { type: String },
  otp: {
    type: String,
  },
  image: {
    type: String,
    default: "",
  },
});

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

const User = mongoose.model("users", userSchema);

module.exports = User;
