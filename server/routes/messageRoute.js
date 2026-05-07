const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { touchSessionActivity } = require("../middleware/sessionActivity");
const {
  getMessageUsers,
  getConversations,
  createGroupConversation,
  getThread,
  sendMessage,
} = require("../controllers/messageController");

router.use(verifyToken);

router.get("/users", getMessageUsers);
router.get("/conversations", getConversations);
router.post("/groups", touchSessionActivity, createGroupConversation);
router.get("/:otherUserId", getThread);
router.post("/", touchSessionActivity, sendMessage);

module.exports = router;
