const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const UserModel = require("../models/userModel");
// Middleware to verify JWT and attach user info to req.user
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("JWT verification failed:", err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const verifySetupToken = async (req, res, next) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: "Setup token required" });

  try {
    const user = await UserModel.findOne({
      setupToken: { $exists: true },
      setupTokenExpires: { $gt: Date.now() }, // only not expired
    }).select("+setupToken");

    if (!user)
      return res
        .status(400)
        .json({ message: "Activation token expired or invalid" });

    const isValid = await bcrypt.compare(token, user.setupToken);
    if (!isValid)
      return res.status(400).json({ message: "Invalid activation token" });

    req.userRecord = user; // attach user for controller
    next();
  } catch (err) {
    console.error("Setup token verification error:", err);
    res.status(500).json({ message: "Failed to verify setup token" });
  }
};

module.exports = { verifyToken, verifySetupToken };
