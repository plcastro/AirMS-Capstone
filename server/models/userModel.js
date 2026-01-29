const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, "Please enter your first name."],
  },
  lastName: { type: String, required: [true, "Please enter your last name."] },
  username: { type: String, required: [true, "Please enter your username."] },
  email: {
    type: String,
    unique: true,
    validate: [validator.isEmail, "Please enter a valid email."],
    required: [true, "Please enter your email."],
  },
  password: { type: String, required: [true, "Please enter a password."] },
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const hash = await bcrypt.hash(this.password, 12);
    this.password = hash;
    next();
  } catch (err) {
    next(err);
  }
});

const User = mongoose.model("User", userSchema);

module.exports = User;
