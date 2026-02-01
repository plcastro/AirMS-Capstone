const UserModel = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Input validation
    if (!password || !identifier) {
      return res.status(400).json({
        message: "Please provide your username/email and password",
      });
    }

    // Find user by username OR email (remove password from query)
    const user = await UserModel.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });
    console.log("Login attempt:", identifier, password);
    console.log("Found user:", user);
    // Generic error message to prevent user enumeration
    if (!user) {
      return res.status(401).json({
        message: "Incorrect credentials",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Incorrect credentials",
      });
    }
    // Check if user account is active (optional)
    if (user.status === "inactive" || user.status === "deactivated") {
      return res.status(401).json({
        message:
          "Account is " +
          (user.status === "inactive" ? " inactive" : " deactivated") +
          ". Please contact support.",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || "fallback_secret",
      {
        expiresIn: "1d",
        issuer: "your-app-name",
        audience: "your-app-users",
      },
    );

    await UserModel.findByIdAndUpdate(user._id, {
      lastLogin: new Date(),
      $inc: { loginCount: 1 },
    });

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      message: "An error occurred during login. Please try again.",
    });
  }
};

const createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, username, password, confirmPassword } =
      req.body;

    if (!firstName || !lastName || !email || !username || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ message: "Password and confirm password do not match" });
    }

    const existingUser = await UserModel.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: email.toLowerCase() },
      ],
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Email or username already registered" });
    }

    const newUser = await UserModel.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      password,
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Registration failed" });
  }
};

const getAllUser = async (req, res) => {
  try {
    const users = await UserModel.find({});
    res.status(200).json({ status: "Ok", data: users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  loginUser,
  createUser,
  getAllUser,
};
