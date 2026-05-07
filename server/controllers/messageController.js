const mongoose = require("mongoose");
const Message = require("../models/messageModel");
const User = require("../models/userModel");
const { auditLog } = require("./logsController");
const { sendToUsers } = require("../utils/realtimeEvents");

const getUserId = (req) => req.user?.id;

const mapUser = (user = {}) => ({
  _id: user._id,
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  username: user.username,
  jobTitle: user.jobTitle,
  image: user.image,
  isOnline: user.isOnline,
  platform: user.platform,
});

const getEntityId = (value) => value?._id || value;

const mapMessage = (message) => ({
  _id: message._id,
  sender: getEntityId(message.sender),
  recipient: getEntityId(message.recipient),
  body: message.body,
  readAt: message.readAt,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
});

const getMessageUsers = async (req, res) => {
  try {
    const userId = getUserId(req);
    const users = await User.find({
      _id: { $ne: userId },
      status: "active",
    })
      .select("firstName lastName username jobTitle image isOnline platform")
      .sort({ firstName: 1, lastName: 1, username: 1 })
      .lean();

    res.status(200).json({ data: users.map(mapUser) });
  } catch (error) {
    console.error("Failed to load message users:", error);
    res.status(500).json({ message: "Failed to load users" });
  }
};

const getConversations = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(getUserId(req));

    const messages = await Message.find({
      $or: [{ sender: userId }, { recipient: userId }],
    })
      .sort({ createdAt: -1 })
      .limit(500)
      .populate("sender recipient", "firstName lastName username jobTitle image isOnline platform")
      .lean();

    const conversations = new Map();

    messages.forEach((message) => {
      const isSentByMe = String(message.sender?._id) === String(userId);
      const otherUser = isSentByMe ? message.recipient : message.sender;
      if (!otherUser?._id) return;

      const key = String(otherUser._id);
      const existing = conversations.get(key);
      const unreadIncrement =
        !isSentByMe && !message.readAt ? 1 : 0;

      conversations.set(key, {
        user: mapUser(otherUser),
        lastMessage: existing?.lastMessage || mapMessage(message),
        unreadCount: (existing?.unreadCount || 0) + unreadIncrement,
      });
    });

    res.status(200).json({ data: [...conversations.values()] });
  } catch (error) {
    console.error("Failed to load conversations:", error);
    res.status(500).json({ message: "Failed to load conversations" });
  }
};

const getThread = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { otherUserId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ message: "Invalid user" });
    }

    const unreadMessages = await Message.find({
      sender: otherUserId,
      recipient: userId,
      readAt: null,
    })
      .select("_id")
      .lean();

    if (unreadMessages.length > 0) {
      const readAt = new Date();
      const messageIds = unreadMessages.map((message) => message._id);

      await Message.updateMany(
        { _id: { $in: messageIds } },
        { readAt },
      );

      sendToUsers([otherUserId, userId], "chat:read", {
        readerId: userId,
        senderId: otherUserId,
        messageIds: messageIds.map(String),
        readAt,
      });
    }

    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: otherUserId },
        { sender: otherUserId, recipient: userId },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(300)
      .lean();

    res.status(200).json({ data: messages.map(mapMessage) });
  } catch (error) {
    console.error("Failed to load messages:", error);
    res.status(500).json({ message: "Failed to load messages" });
  }
};

const sendMessage = async (req, res) => {
  try {
    const senderId = getUserId(req);
    const { recipientId, body } = req.body || {};
    const trimmedBody = String(body || "").trim();

    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({ message: "Select a valid recipient" });
    }

    if (!trimmedBody) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    if (trimmedBody.length > 1000) {
      return res.status(400).json({ message: "Message is too long" });
    }

    if (String(senderId) === String(recipientId)) {
      return res.status(400).json({ message: "You cannot message yourself" });
    }

    const recipient = await User.findOne({
      _id: recipientId,
      status: "active",
    }).select("_id");

    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    const message = await Message.create({
      sender: senderId,
      recipient: recipientId,
      body: trimmedBody,
    });

    const payload = mapMessage(message.toObject());
    sendToUsers([senderId, recipientId], "chat:message", payload);

    auditLog(`Message sent to user: ${recipientId}`, senderId).catch((error) => {
      console.error("Message audit failed:", error);
    });

    res.status(201).json({ data: payload });
  } catch (error) {
    console.error("Failed to send message:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
};

module.exports = {
  getMessageUsers,
  getConversations,
  getThread,
  sendMessage,
};
