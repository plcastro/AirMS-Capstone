const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utilities/sendEmail");
const validator = require("validator");
const fs = require("fs");
const path = require("path");
const UserModel = require("../models/userModel");
const { auditLog } = require("./logsController");
const generateUniqueUsername = require("../utilities/generateUniqueUsername");
const WEB_URL = process.env.WEB_URL;
const MOBILE_URL = process.env.MOBILE_URL;

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 30 * 60 * 1000; // 30 minutes

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
    let { identifier, password } = req.body;

    if (typeof identifier !== "string" || typeof password !== "string") {
      return res.status(400).json({
        message: "Invalid input type",
      });
    }

    identifier = identifier.trim();
    password = password.trim();

    if (!identifier || !password) {
      return res
        .status(400)
        .json({ message: "Username/email and password required" });
    }
    if (/[${}]/.test(identifier) || /[$]/.test(password)) {
      return res.status(400).json({ message: "Invalid input" });
    }

    const user = await UserModel.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    }).select("+password +tempPasswordExpires ");

    if (!user) {
      return res.status(401).json({ message: "Account does not exist" });
    }

    if (user.status === "deactivated") {
      return res
        .status(403)
        .json({ message: "Account deactivated. Contact support." });
    }

    // Check lock
    const currentTime = Date.now();
    if (user.isLocked) {
      if (user.lockUntil && currentTime > user.lockUntil) {
        user.isLocked = false;
        user.failedLoginAttempts = 0;
        user.lockUntil = undefined;
        await user.save();
      } else {
        const remainingTime = Math.round(
          (user.lockUntil - currentTime) / 60000,
        );
        return res.status(403).json({
          message: `Account locked. Try again in ${remainingTime} minutes.`,
        });
      }
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

      if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET not set in environment variables");
      }

      const setupToken = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "1h" },
      );

      return res.status(200).json({
        message: "Temporary login successful. Proceed to security setup.",
        requireSetup: true,
        user: {
          id: user._id,
          status: user.status,
          setupToken,
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
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        jobTitle: user.jobTitle,
        status: user.status,
        image: user.image,
      },
      process.env.JWT_SECRET,
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
      lastLogin: user.lastLogin,
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
  const user = await UserModel.findById(req.body.id);

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
      decoded = jwt.verify(token, process.env.JWT_SECRET);
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
    const { firstName, lastName, email, jobTitle, access, licenseNo } =
      req.body;

    const rolesRequiringLicense = [
      "maintenance manager",
      "pilot",
      "mechanic",
      "officer-in-charge",
    ];

    if (!firstName || !lastName || !email || !jobTitle) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!validator.isEmail(email.trim())) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const normalizedJobTitle = jobTitle.toLowerCase();

    if (
      rolesRequiringLicense.includes(normalizedJobTitle) &&
      (!licenseNo || licenseNo.trim() === "")
    ) {
      return res.status(400).json({ message: "License no. is required" });
    }

    const existingEmail = await UserModel.findOne({ email: email.trim() });
    if (existingEmail) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const username = await generateUniqueUsername(firstName, lastName);

    const tempPassword = Math.random().toString(36).slice(-8);

    const portalLink =
      jobTitle === "Maintenance Manager" ||
      jobTitle === "Officer-In-Charge" ||
      jobTitle === "Admin"
        ? `<p>Login via web: <a href="${WEB_URL}/login">AirMS Web Login</a></p>`
        : `<p>Login via mobile app: <a href="${MOBILE_URL}/login">AirMS Mobile Login</a></p>`;

    await sendEmail({
      to: email,
      subject: "Welcome to AirMS – Your Account Details",
      html: `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; color: #333; line-height: 1.6;">
      <div style="background-color: #0056b3; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to AirMS</h1>
      </div>
      
      <div style="padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <p>Hello <strong>${firstName}</strong>,</p>
        <p>Your AirMS account has been successfully created. You can now log in using the temporary credentials provided below:</p>
        
        <div style="background: #f8f9fa; border-left: 4px solid #0056b3; padding: 15px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Username:</strong> <code style="font-size: 1.1em;">${username}</code></p>
          <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="font-size: 1.1em;">${tempPassword}</code></p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${portalLink}" style="background-color: #0056b3; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Access AirMS Portal</a>
        </div>

        <p style="font-size: 0.9em; color: #666; background: #fff3cd; padding: 10px; border-radius: 4px;">
          <strong>Security Note:</strong> This temporary password expires in <strong>1 hour</strong>. You will be prompted to set a permanent password upon your first login.
        </p>
        
        <p style="margin-top: 25px;">If you didn't expect this email, please contact your administrator.</p>
      </div>
      
      <p style="text-align: center; font-size: 12px; color: #999; margin-top: 20px;">
        &copy; ${new Date().getFullYear()} AirMS Management System. All rights reserved.
      </p>
    </div>
  `,
    });

    let imagePath = "";
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    }

    const newUser = await UserModel.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      username: username.trim(),
      password: hashedPassword,
      tempPasswordExpires,
      status: "inactive",
      image: imagePath,
      jobTitle,
      access,
      licenseNo: rolesRequiringLicense.includes(normalizedJobTitle)
        ? licenseNo
        : null,
    });

    await auditLog(
      `User created: ${username}, email sent successfully`,
      newUser._id,
    );

    res.status(201).json({
      message: "User created successfully",
      data: newUser,
    });
  } catch (err) {
    console.error("Error in createUser:", err);
    res.status(500).json({
      message: "User creation failed (email not sent)",
    });
  }
};

const completeSecuritySetup = async (req, res) => {
  try {
    let { setupToken, newPassword } = req.body;

    if (!setupToken) {
      return res.status(400).json({ message: "Setup token required" });
    }
    setupToken = setupToken.trim();
    newPassword = newPassword.trim();

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters long" });
    }
    const passwordRegex = /^[A-Za-z0-9]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and contain only letters and numbers",
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not set in environment variables");
    }

    let decoded;
    try {
      decoded = jwt.verify(setupToken, process.env.JWT_SECRET);
    } catch (err) {
      return res
        .status(401)
        .json({ message: "Invalid or expired setup token" });
    }

    const user = await UserModel.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.status !== "inactive") {
      return res.status(400).json({ message: "Setup already completed" });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.status = "active";
    user.tempPasswordExpires = undefined;

    await user.save();

    return res.status(200).json({
      message: "Security setup completed successfully",
    });
  } catch (err) {
    console.error("Security setup error:", err);
    return res
      .status(500)
      .json({ message: "Server error during security setup" });
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
    let { firstName, lastName, email, username, access, jobTitle } = req.body;

    if (
      typeof firstName !== "string" ||
      typeof lastName !== "string" ||
      typeof email !== "string" ||
      typeof username !== "string"
    ) {
      return res.status(400).json({
        message: "Invalid input type",
      });
    }

    firstName = firstName.trim();
    lastName = lastName.trim();
    email = email.trim();
    username = username.trim();
    access = access.trim();
    jobTitle = jobTitle.trim();

    if (
      !firstName ||
      !lastName ||
      !email ||
      !username ||
      !access ||
      !jobTitle
    ) {
      return res.status(400).json({ message: "Employee information required" });
    }

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
      { returnDocument: "after" },
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
    let { firstName, lastName } = req.body;

    if (typeof firstName !== "string" || typeof lastName !== "string") {
      return res.status(400).json({
        message: "Invalid input type",
      });
    }
    firstName = firstName.trim();
    lastName = lastName.trim();

    if (!firstName || !lastName) {
      return res
        .status(400)
        .json({ message: "First and Last name is required" });
    }

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
      returnDocument: "after",
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
      { returnDocument: "after" },
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
  // 1. Exit if the user doesn't have an image (prevents the 'null' deletion crash)
  if (!filePath || typeof filePath !== "string" || filePath === "null") return;

  try {
    // 2. Normalize the path (remove leading slash)
    const cleanPath = filePath.startsWith("/")
      ? filePath.substring(1)
      : filePath;

    // 3. Always resolve from the PROJECT ROOT (process.cwd())
    const fullPath = path.resolve(process.cwd(), cleanPath);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log("Successfully deleted old image:", fullPath);
    }
  } catch (err) {
    // We log but don't throw, so the rest of the update-user-image can finish
    console.error("FileSystem Cleanup Error:", err.message);
  }
};

const updateUserImage = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await UserModel.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    let newImagePath = user.image;

    if (req.file) {
      if (
        user.image &&
        typeof user.image === "string" &&
        user.image !== "null"
      ) {
        deleteFile(user.image);
      }

      newImagePath = req.file.savedPath || `/uploads/${req.file.filename}`;

      console.log("New image path ready for DB:", newImagePath);
    } else if (req.body.image === null || req.body.image === "null") {
      if (user.image && typeof user.image === "string") {
        deleteFile(user.image);
      }
      newImagePath = null;
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      id,
      { $set: { image: newImagePath } },
      { returnDocument: "after", runValidators: true },
    );

    res.status(200).json({
      message: newImagePath ? "Avatar updated" : "Avatar removed",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Update Image Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    let { currentPassword, newPassword } = req.body;
    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string"
    ) {
      return res.status(400).json({
        message: "Invalid input type",
      });
    }

    currentPassword = currentPassword.trim();
    newPassword = newPassword.trim();

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Both current and new passwords are required." });
    }

    if (!id) {
      return res.status(400).json({ message: "User ID is required." });
    }

    const user = await UserModel.findById(id).select("+password");
    if (!user) return res.status(404).json({ message: "User not found." });

    if (!user.password) {
      return res.status(400).json({ message: "User has no password set." });
    }

    const isCurrentAndNewMatch = await bcrypt.compare(
      newPassword,
      user.password,
    );
    if (currentPassword === newPassword || isCurrentAndNewMatch) {
      return res
        .status(400)
        .json({ message: "Cannot reuse the same password." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Current password is incorrect." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await UserModel.updateOne({ _id: id }, { password: hashedPassword });

    res.status(200).json({ message: "Password updated successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
};

const updatePIN = async (req, res) => {
  try {
    let { currentPin, newPin } = req.body;
    if (!currentPin || !newPin)
      return res.status(400).json({ message: "PIN is required" });

    const user = await UserModel.findById(req.params.id).select("+pin");

    if (!user.pin) {
      return res.status(400).json({ message: "User has no PIN set." });
    }
    const isSamePin = await bcrypt.compare(newPin, user.pin);
    if (currentPin === newPin || isSamePin) {
      return res.status(400).json({ message: "Cannot reuse the same PIN." });
    }

    const isMatch = await bcrypt.compare(currentPin, user.pin);

    if (!isMatch) {
      return res.status(401).json({ message: "Current PIN is incorrect." });
    }

    const hashedPIN = await bcrypt.hash(newPin, 12);

    await UserModel.updateOne({ _id: req.params.id }, { pin: hashedPIN });
    res.status(200).json({ message: "PIN updated", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const updateSignature = async (req, res) => {
  try {
    const { signature } = req.body;
    if (!signature)
      return res.status(400).json({ message: "Signature is required" });

    const user = await UserModel.findByIdAndUpdate(
      req.params.id,
      { signature },
      { returnDocument: "after" },
    );

    res.status(200).json({ message: "Signature updated", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const activateUser = async (req, res) => {
  try {
    const { token, newPassword, pin } = req.body;

    if (!token || !newPassword || !pin) {
      return res
        .status(400)
        .json({ message: "Token, new password, and PIN is required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res
        .status(401)
        .json({ message: "Setup token invalid or expired" });
    }

    const user = await UserModel.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.status === "active")
      return res.status(400).json({ message: "Account already active" });

    user.password = await bcrypt.hash(newPassword, 12);
    user.pin = await bcrypt.hash(pin, 12);
    user.status = "active";
    user.securitySetupCompleted = true;
    await user.save();

    await auditLog("User activated via JWT setup token", user._id);

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

    // Reset temporary password
    const newTempPassword = Math.random().toString(36).slice(-8);
    user.password = await bcrypt.hash(newTempPassword, 12);
    user.tempPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    // Portal link just goes to login page
    const portalLink = [
      "Admin",
      "Maintenance Manager",
      "Officer-In-Charge",
      "Warehouse Department",
    ].includes(user.jobTitle)
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
  updatePIN,
  updateUserImage,
  updateSignature,
  completeSecuritySetup,
  activateUser,
  resendActivation,
};
