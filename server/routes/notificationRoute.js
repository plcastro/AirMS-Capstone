const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require("../controllers/notificationController");

router.get("/", verifyToken, getNotifications);
router.post("/:id/read", verifyToken, markNotificationRead);
router.post("/mark-all-read", verifyToken, markAllNotificationsRead);

module.exports = router;
