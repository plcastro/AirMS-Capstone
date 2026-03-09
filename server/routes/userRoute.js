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
  activateUser,
  resendActivation,
  completeSecuritySetup,
} = require("../controllers/userController");
const {
  requestPasswordReset,
  resetPassword,
  verifyOtp,
} = require("../controllers/passwordResetController");
const {
  verifyToken,
  verifySetupToken,
} = require("../middleware/authMiddleware");
const { upload, processImage } = require("../middleware/upload");

router.post("/login", rateLimiter, loginUser);
router.post("/logout", logoutUser);
router.post("/create", upload.single("image"), processImage, createUser);
router.get("/username-exists", checkUsernameExists);
router.get("/getAllUsers", getAllUsers);
router.put("/updateUser/:id", upload.single("image"), processImage, updateUser);
router.put("/updateUserProfile/:id", updateUserProfile);
router.put("/change-password/:id", updatePassword);
router.put("/updateUserStatus/:id", updateUserStatus);
router.put(
  "/updateUserImage/:id",
  upload.single("image"),
  processImage,
  updateUserImage,
);

router.post("/activate", activateUser);
router.post("/resend-activation", resendActivation);
router.post("/complete-security-setup", completeSecuritySetup);

router.post("/request-reset", requestPasswordReset);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

module.exports = router;
