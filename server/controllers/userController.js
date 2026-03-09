const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utilities/sendEmail");
const validator = require("validator");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const UserModel = require("../models/userModel");
const { auditLog } = require("./logsController");
const generateUniqueUsername = require("../utilities/generateUniqueUsername");
const WEB_URL = process.env.WEB_URL;
const MOBILE_URL = process.env.MOBILE_URL;

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 30 * 60 * 1000; // 30 minutes

const deleteFile = (filePath) => {
  const absolutePath = path.join(__dirname, "..", filePath);
  fs.unlink(absolutePath, (err) => {
    if (err) console.error(`Failed to delete file: ${absolutePath}`, err);
    else console.log(`Successfully deleted file: ${absolutePath}`);
  });
};

const getAllUsers = async (req, res) => {
  try {
    const users = await UserModel.find({});
    // await auditLog(`Fetched all users. Total: ${users.length}`, null);
    res.status(200).json({ status: "Ok", data: users });
  } catch (err) {
    // await auditLog("Failed to fetch all users", null);
    res.status(500).json({ message: err.message });
  }
};
const loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res
        .status(400)
        .json({ message: "Username/email and password required" });
    }

    const trimmed = identifier.trim();

    const user = await UserModel.findOne({
      $or: [{ username: trimmed }, { email: trimmed }],
    }).select("+password +tempPasswordExpires +setupToken +setupTokenExpires");

    if (!user) {
      return res.status(401).json({ message: "Account does not exist" });
    }

    if (user.status === "deactivated") {
      return res
        .status(403)
        .json({ message: "Account deactivated. Contact support." });
    }

    // Check lock
    if (user.isLocked && user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(403).json({
        message:
          "Account locked due to too many failed login attempts. Try again later.",
      });
    }

    // Handle inactive users separately
    if (user.status === "inactive") {
      if (!user.tempPasswordExpires || user.tempPasswordExpires < Date.now()) {
        return res.status(401).json({
          message: "Temporary password expired. Resend activation.",
        });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid temporary password" });
      }

      return res.status(200).json({
        message: "Temporary login successful. Proceed to security setup.",
        requireSetup: true,
        user: {
          email: user.email,
          id: user._id,
          setupToken: user.rawSetupToken,
        },
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.isLocked = true;
        user.lockUntil = Date.now() + LOCK_TIME;
      }
      await user.save();
      return res
        .status(401)
        .json({ message: "Invalid username/email or password" });
    }

    // Reset failed login attempts
    user.failedLoginAttempts = 0;
    user.isLocked = false;
    user.lockUntil = undefined;
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        jobTitle: user.jobTitle,
        status: user.status,
      },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "1d" },
    );

    await auditLog("User logged in", user._id);

    const responseUser = {
      id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      jobTitle: user.jobTitle,
      status: user.status,
      image: user.image,
    };

    return res.status(200).json({
      message: "Login successful",
      token,
      user: responseUser,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Login failed" });
  }
};

const unlockUser = async (req, res) => {
  const user = await UserModel.findById(req.params.id);

  user.failedLoginAttempts = 0;
  user.isLocked = false;
  user.lockUntil = undefined;

  await user.save();

  res.json({ message: "Account unlocked successfully" });
};

const logoutUser = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    await auditLog(
      `User logged out: ${decoded.username || decoded.id}`,
      decoded.id,
    );
    res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    await auditLog("Logout failed", null);
    res.status(500).json({ message: "Logout failed" });
  }
};

const createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, jobTitle, access } = req.body;

    if (!firstName || !lastName || !email || !jobTitle)
      return res.status(400).json({ message: "All fields are required" });

    if (!validator.isEmail(email.trim()))
      return res.status(400).json({ message: "Invalid email format" });

    const existingEmail = await UserModel.findOne({ email: email.trim() });
    if (existingEmail)
      return res.status(409).json({ message: "Email already registered" });

    const username = await generateUniqueUsername(firstName, lastName);

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8).trim();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const tempPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    const rawSetupToken = crypto.randomBytes(32).toString("hex");
    const setupTokenHash = await bcrypt.hash(rawSetupToken, 10);
    const setupTokenExpires = Date.now() + 60 * 60 * 1000; // 1 hour

    let imagePath = "";
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    }

    const newUser = await UserModel.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      username: username.trim(),
      password: hashedPassword, // temp password stored here
      tempPasswordExpires,
      status: "inactive",
      setupToken: setupTokenHash,
      setupTokenExpires,
      image: imagePath,
      jobTitle,
      access,
    });

    const portalLink =
      jobTitle === "Head of Maintenance" || jobTitle === "Admin"
        ? `<p>Login via web: <a href="${WEB_URL}/#/security-setup?email=${encodeURIComponent(email)}&setupToken=${rawSetupToken}">AirMS Web Login</a></p>`
        : `<p>Login via mobile app: <a href="${MOBILE_URL}/#/security-setup?email=${encodeURIComponent(email)}&setupToken=${rawSetupToken}">AirMS Mobile Login</a></p>`;

    await sendEmail({
      to: email,
      subject: "AirMS Account Created – Temporary Password",
      html: `
        <p>Hello <strong>${firstName}</strong>,</p>
        <p>Your account has been created. Use these credentials to login:</p>
        <p>Username: <strong>${username}</strong></p>
        <p>Temporary password: <strong>${tempPassword}</strong></p>
        ${portalLink}
        <p><strong>Note:</strong> Temporary password expires in 1 hour. You will be prompted to create a permanent password on first login.</p>
      `,
    });

    await auditLog(
      `User created: ${username}, Temp password issued`,
      newUser._id,
    );

    res.status(201).json({
      message: "User added successfully",
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        jobTitle: newUser.jobTitle,
        status: newUser.status,
        setupToken: rawSetupToken,
      },
    });
  } catch (err) {
    console.error("Error in createUser:", err);
    await auditLog("Failed to create user", null);
    res.status(500).json({ message: "User account creation failed" });
  }
};

const completeSecuritySetup = async (req, res) => {
  try {
    const user = req.userRecord; // from middleware
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8)
      return res
        .status(400)
        .json({ message: "New password required (min 8 chars)" });

    user.password = await bcrypt.hash(newPassword, 12);
    user.status = "active";
    user.tempPasswordExpires = undefined;
    user.securitySetupCompleted = true;
    await user.save();

    await auditLog("Security setup completed", user._id);
    res.status(200).json({ message: "Security setup completed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to complete security setup" });
  }
};

const checkUsernameExists = async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res
        .status(400)
        .json({ exists: false, message: "Username is required" });
    }

    const existingUser = await UserModel.findOne({
      username: username.trim(),
    }).select("_id");

    return res.status(200).json({
      exists: !!existingUser,
    });
  } catch (err) {
    console.error("Username check error:", err);
    return res.status(500).json({ exists: false, message: "Server error" });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, username, access, jobTitle } = req.body;

    const user = await UserModel.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const changes = {};
    if (firstName && firstName !== user.firstName)
      changes.firstName = { old: user.firstName, new: firstName };
    if (lastName && lastName !== user.lastName)
      changes.lastName = { old: user.lastName, new: lastName };
    if (email && email !== user.email)
      changes.email = { old: user.email, new: email };
    if (username && username !== user.username)
      changes.username = { old: user.username, new: username };
    if (jobTitle && jobTitle !== user.jobTitle)
      changes.jobTitle = { old: user.jobTitle, new: jobTitle };
    if (access && access !== user.access)
      changes.access = { old: user.access, new: access };

    const updatedUser = await UserModel.findByIdAndUpdate(
      id,
      { firstName, lastName, email, username, access, jobTitle },
      { new: true },
    );

    if (Object.keys(changes).length > 0) {
      await auditLog(
        `User updated: ${username}. Changes: ${JSON.stringify(changes)}`,
        updatedUser._id,
      );
    } else {
      await auditLog(
        `User update attempted but no changes detected: ${username}`,
        updatedUser._id,
      );
    }

    res
      .status(200)
      .json({ message: "User updated successfully", user: updatedUser });
  } catch (err) {
    console.error("Error updating user:", err);
    await auditLog("Failed to update user", null);
    res.status(500).json({ message: err.message || "Failed to update user" });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName } = req.body;

    const user = await UserModel.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const updateData = {};
    if (firstName && firstName.trim() !== user.firstName)
      updateData.firstName = firstName.trim();
    if (lastName && lastName.trim() !== user.lastName)
      updateData.lastName = lastName.trim();

    if (Object.keys(updateData).length === 0) {
      return res
        .status(200)
        .json({ message: "No name changes provided", user });
    }

    const updatedUser = await UserModel.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    await auditLog(
      `User name updated: ${updatedUser.username}`,
      updatedUser._id,
    );

    res
      .status(200)
      .json({ message: "Name updated successfully", user: updatedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update name" });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const user = await UserModel.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const updatedUser = await UserModel.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );

    await auditLog(
      `User status updated: ${user.username}. Old: ${user.status}, New: ${status}`,
      updatedUser._id,
    );

    res
      .status(200)
      .json({ message: "User status updated successfully", user: updatedUser });
  } catch (err) {
    console.error("Error updating user status:", err);
    await auditLog("Failed to update user status", null);
    res
      .status(500)
      .json({ message: err.message || "Failed to update user status" });
  }
};

const updateUserImage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file)
      return res.status(400).json({ message: "No image file provided" });

    const user = await UserModel.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.image) deleteFile(user.image);

    const newImagePath = `/uploads/${req.file.filename}`;
    const updatedUser = await UserModel.findByIdAndUpdate(
      id,
      { image: newImagePath },
      { new: true },
    );

    await auditLog(
      `User avatar updated: ${updatedUser.username}`,
      updatedUser._id,
    );

    res
      .status(200)
      .json({ message: "Avatar updated successfully", user: updatedUser });
  } catch (err) {
    console.error("Error updating avatar:", err);
    res.status(500).json({ message: "Failed to update avatar" });
  }
};
const updatePassword = async (req, res) => {
  try {
    const userId = req.params.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Both current and new passwords are required." });
    }

    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Current password is incorrect." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await UserModel.updateOne({ _id: userId }, { password: hashedPassword });

    res.status(200).json({ message: "Password updated successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
};

const activateUser = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await UserModel.findOne({ email: email.trim() }).select(
      "+setupToken +setupTokenExpires",
    );

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.status === "active")
      return res.status(400).json({ message: "Account already active" });

    // Check if token exists and is not expired
    if (
      !user.setupToken ||
      !user.setupTokenExpires ||
      user.setupTokenExpires < Date.now()
    ) {
      return res
        .status(401)
        .json({ message: "Setup token expired. Resend activation." });
    }

    const isValidToken = await bcrypt.compare(token, user.setupToken); // raw token vs hash
    if (!isValidToken)
      return res.status(401).json({ message: "Invalid setup token." });

    // Update password and activate account
    user.password = await bcrypt.hash(newPassword, 12);
    user.status = "active";
    user.setupToken = undefined;
    user.setupTokenExpires = undefined;
    await user.save();

    await auditLog("User activated", user._id);

    res.status(200).json({ message: "Account activated successfully" });
  } catch (err) {
    console.error("activateUser error:", err);
    res.status(500).json({ message: "Activation failed" });
  }
};

const resendActivation = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const user = await UserModel.findOne({ email: email.trim() });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.status === "active")
      return res.status(400).json({ message: "Account is already active" });

    const newTempPassword = Math.random().toString(36).slice(-8);
    user.password = await bcrypt.hash(newTempPassword, 12);
    user.tempPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const portalLink = ["Admin", "Head of Maintenance"].includes(user.jobTitle)
      ? `<p>Login via web: <a href="${WEB_URL}/#/login">AirMS Web Login</a></p>`
      : `<p>Login via mobile app: <a href="${MOBILE_URL}/#/login">AirMS Mobile Login</a></p>`;

    await sendEmail({
      to: user.email,
      subject: "AirMS Account Activation – Resend",
      html: `<p>Hello <strong>${user.firstName}</strong>,</p>
             <p>Your temporary password has been reset. Use it to log in:</p>
             <p>Temporary password: <strong>${newTempPassword}</strong></p>
             ${portalLink}
             <p><strong>Note:</strong> Temporary password expires in 1 hour. You will be prompted to create a permanent password on first login.</p>`,
    });

    await auditLog("Activation email resent", user._id);
    res.status(200).json({ message: "Activation email resent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to resend activation" });
  }
};

module.exports = {
  loginUser,
  logoutUser,
  createUser,
  checkUsernameExists,
  updateUser,
  getAllUsers,
  updateUserStatus,
  updateUserProfile,
  updatePassword,
  updateUserImage,
  completeSecuritySetup,
  activateUser,
  resendActivation,
};
