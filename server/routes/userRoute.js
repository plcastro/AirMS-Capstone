const express = require("express");
const router = express.Router();
const rateLimiter = require("../middleware/rateLimiter");
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
router.get("/getAllUsers", getAllUsers);
router.put("/updateUser/:id", upload.single("image"), processImage, updateUser);
router.put("/updateUserProfile/:id", updateUserProfile);
router.put("/change-password/:id", updatePassword);
router.put("/updatePIN/:id", updatePIN);
router.put("/updateUserStatus/:id", updateUserStatus);
router.put(
  "/updateUserImage/:id",
  upload.single("image"),
  processImage,
  updateUserImage,
);
router.put("/updateSignature/:id", updateSignature);

router.post("/activate", activateUser);
router.post("/resend-activation", resendActivation);
router.post("/complete-security-setup", completeSecuritySetup);

// --- Password & PIN reset routes ---
router.post("/request-password-reset", requestPasswordReset);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

router.post("/request-pin-reset", requestPinReset);
router.post("/verify-pin-otp", verifyPinOtp);
router.post("/reset-pin", resetPin);

module.exports = router;
