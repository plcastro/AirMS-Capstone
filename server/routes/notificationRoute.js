const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { createSessionWarning } = require("../controllers/sessionNotificationController");
const {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearReadNotifications,
} = require("../controllers/notificationController");

router.get("/", verifyToken, getNotifications);
router.post("/session-warning", verifyToken, createSessionWarning);
router.post("/mark-all-read", verifyToken, markAllNotificationsRead);
router.post("/clear-read", verifyToken, clearReadNotifications);
router.post("/:id/read", verifyToken, markNotificationRead);

module.exports = router;
