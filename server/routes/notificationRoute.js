const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require("../controllers/notificationController");

router.get("/", verifyToken, getNotifications);
router.post("/mark-all-read", verifyToken, markAllNotificationsRead);
router.post("/:id/read", verifyToken, markNotificationRead);

module.exports = router;
