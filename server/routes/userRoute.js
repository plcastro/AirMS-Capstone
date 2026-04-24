const express = require("express");
const router = express.Router();
const { rateLimiter, otpRequestLimiter } = require("../middleware/rateLimiter");
const { verifyToken } = require("../middleware/authMiddleware");
const rbacMiddleware = require("../middleware/rbacMiddleware");
const {
  loginUser,
  refreshToken,
  logoutUser,
  registerMobilePushDevice,
  createUser,
  checkUsernameExists,
  getAllUsers,
  updateUser,
  updateUserStatus,
  updateUserProfile,
  updatePassword,
  updateUserImage,
  updatePIN,
  updateSignature,
  activateUser,
  resendActivation,
  completeSecuritySetup,
} = require("../controllers/userController");

const {
  requestPasswordReset,
  verifyOtp,
  resetPassword,
  requestPinReset,
  verifyPinOtp,
  resetPin,
} = require("../controllers/passwordResetController");

const {
  upload,
  processImage,
  handleUploadError,
} = require("../middleware/upload");

// User management routes
router.post("/login", rateLimiter, loginUser);
router.post("/refresh-token", refreshToken);
router.post("/logout", logoutUser);
router.post(
  "/register-mobile-push-device",
  verifyToken,
  registerMobilePushDevice,
);

// Admin-only routes (user creation and management)
router.post(
  "/create",
  verifyToken,
  rbacMiddleware.requireAdmin,
  rbacMiddleware.verifyPrivilegeLevelChange,
  upload.single("image"),
  processImage,
  createUser,
);
router.get("/username-exists", checkUsernameExists);
router.get(
  "/get-all-users",
  verifyToken,
  rbacMiddleware.requireAdmin,
  rbacMiddleware.logAdminAction,
  getAllUsers,
);
router.put(
  "/update-user/:id",
  verifyToken,
  rbacMiddleware.requireAdmin,
  rbacMiddleware.verifyPrivilegeLevelChange,
  rbacMiddleware.logAdminAction,
  upload.single("image"),
  processImage,
  updateUser,
);
router.put(
  "/update-user-profile/:id",
  verifyToken,
  rbacMiddleware.requireSelfOrAdmin("id"),
  updateUserProfile,
);
router.put(
  "/change-password/:id",
  verifyToken,
  rbacMiddleware.requireSelfOrAdmin("id"),
  updatePassword,
);
router.put(
  "/update-pin/:id",
  verifyToken,
  rbacMiddleware.requireSelfOrAdmin("id"),
  updatePIN,
);
router.put(
  "/update-user-status/:id",
  verifyToken,
  rbacMiddleware.requireAdmin,
  rbacMiddleware.logAdminAction,
  updateUserStatus,
);
router.put(
  "/update-user-image/:id",
  verifyToken,
  rbacMiddleware.requireSelfOrAdmin("id"),
  upload.single("image"),
  processImage,
  updateUserImage,
);
router.delete(
  "/update-user-image/:id",
  verifyToken,
  rbacMiddleware.requireSelfOrAdmin("id"),
  updateUserImage,
);
router.put(
  "/updateSignature/:id",
  upload.single("signature"),
  processImage,
  updateSignature,
);

router.post("/activate", activateUser);
router.post("/resend-activation", resendActivation);
router.post("/complete-security-setup", completeSecuritySetup);

router.post("/request-password-reset", requestPasswordReset);
router.post("/verify-otp", otpRequestLimiter, verifyOtp);
router.post("/reset-password", resetPassword);

router.post("/request-pin-reset/:id", requestPinReset);
router.post("/verify-pin-otp", otpRequestLimiter, verifyPinOtp);
router.post("/reset-pin", resetPin);

router.use(handleUploadError);

module.exports = router;
