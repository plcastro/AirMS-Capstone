const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { touchSessionActivity } = require("../middleware/sessionActivity");
const {
  messageUpload,
  saveMessageAttachments,
  handleMessageUploadError,
} = require("../middleware/messageUpload");
const {
  getMessageUsers,
  getConversations,
  getMessageSummary,
  createGroupConversation,
  getThread,
  sendMessage,
} = require("../controllers/messageController");

router.use(verifyToken);

router.get("/users", getMessageUsers);
router.get("/conversations", getConversations);
router.get("/summary", getMessageSummary);
router.post("/groups", touchSessionActivity, createGroupConversation);
router.get("/:otherUserId", getThread);
router.post(
  "/",
  touchSessionActivity,
  messageUpload.array("attachments", 5),
  handleMessageUploadError,
  saveMessageAttachments,
  sendMessage,
);

module.exports = router;
