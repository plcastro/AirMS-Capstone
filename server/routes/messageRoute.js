const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { touchSessionActivity } = require("../middleware/sessionActivity");
const {
  getMessageUsers,
  getConversations,
  getThread,
  sendMessage,
} = require("../controllers/messageController");

router.use(verifyToken);

router.get("/users", getMessageUsers);
router.get("/conversations", getConversations);
router.get("/:otherUserId", getThread);
router.post("/", touchSessionActivity, sendMessage);

module.exports = router;
