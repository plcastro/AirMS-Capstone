const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { touchSessionActivity } = require("../middleware/sessionActivity");
const {
  messageUpload,
  saveMessageAttachments,
  handleMessageUploadError,
  handleMessageAttachmentUpload,
  validateDirectMessageAttachments,
} = require("../middleware/messageUpload");
const {
  getMessageUsers,
  getConversations,
  getMessageSummary,
  createGroupConversation,
  getThread,
  sendMessage,
  getMessageAttachmentUrl,
} = require("../controllers/messageController");

router.use(verifyToken);

router.get("/users", getMessageUsers);
router.get("/conversations", getConversations);
router.get("/summary", getMessageSummary);
router.post("/groups", touchSessionActivity, createGroupConversation);
router.post(
  "/attachments/upload",
  touchSessionActivity,
  handleMessageAttachmentUpload,
);
router.get(
  "/:messageId/attachments/:attachmentIndex",
  getMessageAttachmentUrl,
);
router.get("/:otherUserId", getThread);
router.post(
  "/",
  touchSessionActivity,
  messageUpload.array("attachments", 5),
  handleMessageUploadError,
  saveMessageAttachments,
  validateDirectMessageAttachments,
  sendMessage,
);

module.exports = router;
