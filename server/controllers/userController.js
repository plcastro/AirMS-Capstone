const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const rateLimit = require("express-rate-limit");
const UserModel = require("../models/userModel");
const { auditLog } = require("./logsController");
const sendEmail = require("../utilities/sendEmail");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const generateUniqueUsername = require("../utilities/generateUniqueUsername");

// --- GET ALL USERS ---
const getAllUsers = async (req, res) => {
  try {
    const users = await UserModel.find({});
    await auditLog(`Fetched all users. Total: ${users.length}`, null);
    res.status(200).json({ status: "Ok", data: users });
  } catch (err) {
    console.error("Error fetching users:", err);
    await auditLog("Failed to fetch all users", null);
    res.status(500).json({ message: err.message });
  }
};

// --- LOGIN USER ---
const loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier || !password)
      return res
        .status(400)
        .json({ message: "Username/email and password required" });

    console.log("Identifier received:", `"${trimmedIdentifier}"`);

    const user = await UserModel.findOne({
      $or: [
        { username: `${trimmedIdentifier}` },
        { email: `${trimmedIdentifier}` },
      ],
    }).collation({ locale: "en", strength: 2 });

    if (!user)
      return res.status(401).json({ message: "This account does not exists" });

    if (user.status === "deactivated") {
      return res
        .status(401)
        .json({ message: "Account deactivated. Please contact AirMS Support" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    const tempPasswordMatch = user.tempPassword
      ? await bcrypt.compare(password, user.tempPassword)
      : false;

    if (!passwordMatch && !tempPasswordMatch) {
      await auditLog(`Failed login attempt: ${identifier}`, user._id);
      return res
        .status(401)
        .json({ message: "Incorrect username/email and password" });
    }

    // --- JWT ---
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        position: user.position,
      },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "1d" },
    );

    await auditLog("User logged in", user._id);

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        position: user.position,
        status: user.status,
        requiresPasswordChange: tempPasswordMatch,
        password: user.password,
        image: user.image,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
};

// --- LOGOUT USER ---
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

// --- CREATE USER ---
const createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, position, access, image } =
      req.body;

    if (!firstName || !lastName || !email || !password || !position) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!validator.isEmail(email.trim())) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const existingEmail = await UserModel.findOne({ email: email.trim() });
    if (existingEmail) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const username = await generateUniqueUsername(firstName, lastName);

    const hashedPassword = await bcrypt.hash(password, 12);

    const tempPassword = Math.random().toString(36).slice(-8);
    const tempPasswordHashed = await bcrypt.hash(tempPassword, 12);

    let imagePath = "/uploads/default_avatar.jpg"; // DEFAULT IMAGE PROFILE

    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    }

    const setupToken = crypto.randomBytes(32).toString("hex");
    const setupTokenHash = await bcrypt.hash(setupToken, 10);

    const newUser = await UserModel.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      username: username.trim(),
      password: hashedPassword,
      position,
      access,
      status: "inactive",
      tempPassword: tempPasswordHashed,
      image: imagePath,
      setupToken: setupTokenHash,
      setupTokenExpires: Date.now() + 60 * 60 * 1000, // 1 hour
    });

    const setupLink = `http://localhost:8081/#/security-setup?token=${setupToken}`;
    console.log("EMAIL_USER:", process.env.EMAIL_USER);
    try {
      await sendEmail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "AirMS User Creation",
        html: `
          <p>Hello, ${firstName}</p>
          <p>Your account with the username <strong>${username}</strong> has been created successfully.</p>
          <p>Please use the temporary password below and follow this link to set your password:</p>
          <p><strong>Temp Password:</strong> ${tempPassword}</p>
          <p><strong>Setup Link:</strong> <a href="${setupLink}">${setupLink}</a></p>
        `,
      });

      await auditLog(
        `User created: ${username} (${email}), Role: ${position}, Temp Password issued`,
        newUser._id,
      );
    } catch (err) {
      console.error(`Failed to send email to ${email}:`, err);
      await auditLog(
        `User created but failed to send email: ${username} (${email})`,
        newUser._id,
      );
    }

    // 12. Success response
    res.status(201).json({
      message: "User added successfully",
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        position: newUser.position,
        status: newUser.status,
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
    const userId = req.user?.id;
    const { newPassword } = req.body;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      {
        password: hashedPassword,
        securitySetupCompleted: true,
        status: "active",
      },
      { new: true },
    );

    res.status(200).json({
      message: "Security setup completed",
      user: {
        id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        username: updatedUser.username,
        role: updatedUser.role,
        status: updatedUser.status,
      },
    });
  } catch (error) {
    console.error("Security setup error:", error);
    res.status(500).json({ message: "Failed to complete security setup" });
  }
};
// --- CHECK USERNAME EXISTS ---
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

// --- UPDATE USER ---
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, username, access, position } = req.body;

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
    if (position && position !== user.position)
      changes.position = { old: user.position, new: position };
    if (access && access !== user.access)
      changes.access = { old: user.access, new: access };

    const updatedUser = await UserModel.findByIdAndUpdate(
      id,
      { firstName, lastName, email, username, access, position },
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

// --- UPDATE USER PROFILE ---
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

    if (Object.keys(updateData).length === 0)
      return res.status(400).json({ message: "No changes provided" });

    const updatedUser = await UserModel.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    await auditLog(
      `User profile updated: ${updatedUser.username}`,
      updatedUser._id,
    );

    res.status(200).json({ message: "Profile updated", user: updatedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

// --- UPDATE USER STATUS ---
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

const deleteFile = (filePath) => {
  const absolutePath = path.join(__dirname, "..", filePath);

  fs.unlink(absolutePath, (err) => {
    if (err) {
      console.error(`Failed to delete file: ${absolutePath}`, err);
    } else {
      console.log(`Successfully deleted file: ${absolutePath}`);
    }
  });
};

/// --- UPDATE USER IMAGE ONLY ---
const updateUserImage = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Request Body:", req.body);
    console.log("Request File:", req.file);

    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const user = await UserModel.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.image) {
      deleteFile(user.image);
    }

    const newImagePath = req.file.savedPath;

    const updatedUser = await UserModel.findByIdAndUpdate(
      id,
      { image: newImagePath },
      { new: true },
    );

    await auditLog(
      `User image updated: ${updatedUser.username}`,
      updatedUser._id,
    );

    res
      .status(200)
      .json({ message: "Image updated successfully", user: updatedUser });
  } catch (err) {
    console.error("Error updating image:", err);
    res.status(500).json({ message: "Failed to update image" });
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

    // Compare current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Current password is incorrect." });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update only the password
    await UserModel.updateOne({ _id: userId }, { password: hashedPassword });

    res.status(200).json({ message: "Password updated successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
};

// --- ACTIVATE USER (SECURITY SETUP) ---
const activateUser = async (req, res) => {
  try {
    const { token, tempPassword, newPassword } = req.body;

    if (!token || !tempPassword || !newPassword) {
      return res.status(400).json({ message: "All fields required" });
    }

    const user = await UserModel.findOne({
      setupToken: { $exists: true },
      setupTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Activation token expired" });
    }

    const tokenMatch = await bcrypt.compare(token, user.setupToken);
    if (!tokenMatch) {
      return res.status(400).json({ message: "Invalid activation token" });
    }

    const tempMatch = await bcrypt.compare(tempPassword, user.tempPassword);
    if (!tempMatch) {
      return res.status(400).json({ message: "Invalid temporary password" });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.status = "active";
    user.tempPassword = undefined;
    user.setupToken = undefined;
    user.setupTokenExpires = undefined;

    await user.save();

    await auditLog(`User activated`, user._id);

    res.status(200).json({ message: "Account activated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Activation failed" });
  }
};

// --- RESEND ACTIVATION EMAIL ---
const resendActivation = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    const user = await UserModel.findOne({ email: email.trim() });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.status === "active") {
      return res.status(400).json({ message: "Account already active" });
    }

    const newTempPassword = Math.random().toString(36).slice(-8);
    const tempHash = await bcrypt.hash(newTempPassword, 12);

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = await bcrypt.hash(rawToken, 10);

    user.tempPassword = tempHash;
    user.setupToken = tokenHash;
    user.setupTokenExpires = Date.now() + 60 * 60 * 1000;

    await user.save();

    const setupLink = `http://localhost:8081/#/security-setup?token=${rawToken}`;

    await sendEmail({
      to: email,
      subject: "Resend Activation – AirMS",
      html: `
        <p>Hello ${user.firstName},</p>
        <p>Your new temporary password:</p>
        <strong>${newTempPassword}</strong>
        <p><a href="${setupLink}">Activate Account</a></p>
        <p>Valid for 1 hour.</p>
      `,
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
