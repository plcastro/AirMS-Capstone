const express = require("express");
const router = express.Router();

const { rateLimiter, otpRequestLimiter } = require("../middleware/rateLimiter");

const { verifyToken } = require("../middleware/authMiddleware");

const { touchSessionActivity } = require("../middleware/sessionActivity");

const {
  requireActionConfirmation,
} = require("../middleware/actionConfirmation");

const permissions = require("../config/permissions");

const { requirePermission } = require("../middleware/permissions");

const {
  upload,
  processImage,
  handleUploadError,
} = require("../middleware/upload");

const {
  loginUser,
  verifyLoginOtp,
  resendLoginOtp,
  refreshToken,
  updateSessionPreference,
  logoutUser,
  registerMobilePushDevice,
  createUser,
  checkUsernameExists,
  getAllUsers,
  getAssignableUsers,
  updateUser,
  updateUserStatus,
  updateUserProfile,
  updatePassword,
  updateUserImage,
  updatePIN,
  verifyPIN,
  updateSignature,
  activateUser,
  resendActivation,
  resendActivationByAdmin,
  extendInvitationExpiry,
  revokeInvitation,
  completeSecuritySetup,
  revokeTrustedDevice,
  revokeAllTrustedDevices,
} = require("../controllers/userController");

const {
  requestPasswordReset,
  verifyOtp,
  resetPassword,
  requestPinReset,
  verifyPinOtp,
  resetPin,
} = require("../controllers/passwordResetController");

/* =========================================
   AUTH
========================================= */

router.post("/login", rateLimiter, loginUser);
router.post("/login/verify-otp", otpRequestLimiter, verifyLoginOtp);
router.post("/login/resend-otp", otpRequestLimiter, resendLoginOtp);

router.post("/refresh-token", refreshToken);
router.put(
  "/session-preference",
  verifyToken,
  touchSessionActivity,
  updateSessionPreference,
);

router.post("/logout", logoutUser);
router.post(
  "/trusted-device/revoke",
  verifyToken,
  touchSessionActivity,
  revokeTrustedDevice,
);
router.post(
  "/trusted-device/revoke-all",
  verifyToken,
  touchSessionActivity,
  revokeAllTrustedDevices,
);

router.post(
  "/register-mobile-push-device",
  verifyToken,
  touchSessionActivity,
  registerMobilePushDevice,
);

/* =========================================
   USER MANAGEMENT
========================================= */

router.post(
  "/create",
  verifyToken,
  touchSessionActivity,
  requirePermission(permissions.USERS_CREATE),
  requireActionConfirmation,
  upload.single("image"),
  processImage,
  createUser,
);

router.get("/username-exists", checkUsernameExists);

router.get(
  "/get-all-users",
  verifyToken,
  touchSessionActivity,
  requirePermission(permissions.USERS_READ),
  getAllUsers,
);

router.get(
  "/assignable-users",
  verifyToken,
  touchSessionActivity,
  requirePermission(permissions.MECHANICS_READ),
  getAssignableUsers,
);

router.put(
  "/update-user/:id",
  verifyToken,
  touchSessionActivity,
  requirePermission(permissions.USERS_UPDATE),
  requireActionConfirmation,
  upload.single("image"),
  processImage,
  updateUser,
);

router.put(
  "/update-user-status/:id",
  verifyToken,
  touchSessionActivity,
  requirePermission(permissions.USERS_UPDATE),
  requireActionConfirmation,
  updateUserStatus,
);

/* =========================================
   PROFILE MANAGEMENT
========================================= */

router.put(
  "/update-user-profile/:id",
  verifyToken,
  touchSessionActivity,
  requirePermission(permissions.PROFILE_UPDATE),
  requireActionConfirmation,
  updateUserProfile,
);

router.put(
  "/change-password/:id",
  verifyToken,
  touchSessionActivity,
  requirePermission(permissions.PROFILE_UPDATE),
  requireActionConfirmation,
  updatePassword,
);

router.put(
  "/update-pin/:id",
  verifyToken,
  touchSessionActivity,
  requirePermission(permissions.PROFILE_UPDATE),
  requireActionConfirmation,
  updatePIN,
);

router.post(
  "/verify-pin/:id",
  verifyToken,
  requirePermission(permissions.PROFILE_READ),
  verifyPIN,
);

router.put(
  "/update-user-image/:id",
  verifyToken,
  touchSessionActivity,
  requirePermission(permissions.PROFILE_UPDATE),
  requireActionConfirmation,
  upload.single("image"),
  processImage,
  updateUserImage,
);

router.delete(
  "/update-user-image/:id",
  verifyToken,
  touchSessionActivity,
  requirePermission(permissions.PROFILE_UPDATE),
  requireActionConfirmation,
  updateUserImage,
);

router.put(
  "/updateSignature/:id",
  verifyToken,
  touchSessionActivity,
  requirePermission(permissions.PROFILE_UPDATE),
  requireActionConfirmation,
  upload.single("signature"),
  processImage,
  updateSignature,
);

/* =========================================
   ACTIVATION
========================================= */

router.post("/activate", activateUser);

router.post("/resend-activation", resendActivation);

router.post(
  "/resend-activation/:id",
  verifyToken,
  touchSessionActivity,
  requirePermission(permissions.USERS_UPDATE),
  requireActionConfirmation,
  resendActivationByAdmin,
);

router.put(
  "/extend-invitation-expiry/:id",
  verifyToken,
  touchSessionActivity,
  requirePermission(permissions.USERS_UPDATE),
  requireActionConfirmation,
  extendInvitationExpiry,
);

router.put(
  "/revoke-invitation/:id",
  verifyToken,
  touchSessionActivity,
  requirePermission(permissions.USERS_UPDATE),
  requireActionConfirmation,
  revokeInvitation,
);

router.post("/complete-security-setup", completeSecuritySetup);

router.post("/request-password-reset", requestPasswordReset);

router.post("/verify-otp", otpRequestLimiter, verifyOtp);

router.post("/reset-password", resetPassword);

/* =========================================
   PIN RESET
========================================= */

router.post("/request-pin-reset/:id", requestPinReset);

router.post("/verify-pin-otp", otpRequestLimiter, verifyPinOtp);

router.post("/reset-pin", resetPin);

/* =========================================
   ERROR HANDLER
========================================= */

router.use(handleUploadError);

module.exports = router;
