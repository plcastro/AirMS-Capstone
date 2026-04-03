const express = require("express");
const router = express.Router();
const { rateLimiter, otpRequestLimiter } = require("../middleware/rateLimiter");
const {
  loginUser,
  logoutUser,
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

const { upload, processImage } = require("../middleware/upload");

// User management routes
router.post("/login", rateLimiter, loginUser);
router.post("/logout", logoutUser);
router.post("/create", upload.single("image"), processImage, createUser);
router.get("/username-exists", checkUsernameExists);
router.get("/get-all-users", getAllUsers);
router.put(
  "/update-user/:id",
  upload.single("image"),
  processImage,
  updateUser,
);
router.put("/update-user-profile/:id", updateUserProfile);
router.put("/change-password/:id", updatePassword);
router.put("/update-pin/:id", updatePIN);
router.put("/update-user-status/:id", updateUserStatus);
router.put(
  "/update-user-image/:id",
  upload.single("image"),
  processImage,
  updateUserImage,
);
router.put("/updateSignature/:id", updateSignature);

router.post("/activate", activateUser);
router.post("/resend-activation", resendActivation);
router.post("/complete-security-setup", completeSecuritySetup);

router.post("/request-password-reset", requestPasswordReset);
router.post("/verify-otp", otpRequestLimiter, verifyOtp);
router.post("/reset-password", resetPassword);

router.post("/request-pin-reset/:id", requestPinReset);
router.post("/verify-pin-otp", otpRequestLimiter, verifyPinOtp);
router.post("/reset-pin", resetPin);

module.exports = router;
