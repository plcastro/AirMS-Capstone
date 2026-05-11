const mongoose = require("mongoose");
const Conversation = require("../models/conversationModel");
const Message = require("../models/messageModel");
const User = require("../models/userModel");
const { auditLog } = require("./logsController");
const { sendToUsers } = require("../utils/realtimeEvents");
const { sendPushNotificationToUsers } = require("../utils/mobilePushService");

const getUserId = (req) => req.user?.id;

const getEntityId = (value) => value?._id || value;

const isSameId = (first, second) => String(first) === String(second);

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

const mapMessage = (message) => ({
  _id: message._id,
  sender: getEntityId(message.sender),
  recipient: getEntityId(message.recipient),
  conversation: getEntityId(message.conversation),
  body: message.body,
  attachments: message.attachments || [],
  readAt: message.readAt,
  readBy: message.readBy || [],
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
});

const mapGroup = (conversation = {}) => ({
  _id: conversation._id,
  id: conversation._id,
  type: "group",
  name: conversation.name,
  members: Array.isArray(conversation.members) ? conversation.members.map(mapUser) : [],
  createdBy: getEntityId(conversation.createdBy),
  createdAt: conversation.createdAt,
  updatedAt: conversation.updatedAt,
});

const getGroupReadAt = (message, userId) =>
  (message.readBy || []).find((receipt) => isSameId(getEntityId(receipt.user), userId))?.readAt || null;

const getUnreadMessageSenderCount = async (userId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const directSenders = await Message.distinct("sender", {
    conversation: { $exists: false },
    recipient: userObjectId,
    readAt: null,
  });

  const groupConversations = await Conversation.find({ members: userObjectId })
    .select("_id")
    .lean();
  const groupConversationIds = groupConversations.map((conversation) => conversation._id);

  const groupSenders =
    groupConversationIds.length > 0
      ? await Message.distinct("sender", {
          conversation: { $in: groupConversationIds },
          sender: { $ne: userObjectId },
          "readBy.user": { $ne: userObjectId },
        })
      : [];

  return new Set([...directSenders, ...groupSenders].map(String)).size;
};

const notifyUnreadMessageSummary = async (recipientIds = []) => {
  const uniqueRecipientIds = [...new Set(recipientIds.map(String).filter(Boolean))];

  await Promise.all(
    uniqueRecipientIds.map(async (recipientId) => {
      const unreadSenderCount = await getUnreadMessageSenderCount(recipientId);
      if (unreadSenderCount === 0) return;

      await sendPushNotificationToUsers({
        title: "You have unread messages",
        body: `Unread messages from ${unreadSenderCount} ${
          unreadSenderCount === 1 ? "person" : "people"
        }.`,
        recipientUsers: [recipientId],
        data: {
          module: "messages",
          unreadSenderCount,
        },
      });
    }),
  );
};

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

    const directMessages = await Message.find({
      conversation: { $exists: false },
      $or: [{ sender: userId }, { recipient: userId }],
    })
      .sort({ createdAt: -1 })
      .limit(500)
      .populate("sender recipient", "firstName lastName username jobTitle image isOnline platform")
      .lean();

    const conversations = new Map();

    directMessages.forEach((message) => {
      const isSentByMe = isSameId(message.sender?._id, userId);
      const otherUser = isSentByMe ? message.recipient : message.sender;
      if (!otherUser?._id) return;

      const key = `direct:${otherUser._id}`;
      const existing = conversations.get(key);
      const hasUnread = Boolean(existing?.unreadCount) || (!isSentByMe && !message.readAt);

      conversations.set(key, {
        type: "direct",
        user: mapUser(otherUser),
        lastMessage: existing?.lastMessage || mapMessage(message),
        unreadCount: hasUnread ? 1 : 0,
      });
    });

    const groupConversations = await Conversation.find({ members: userId })
      .populate("members", "firstName lastName username jobTitle image isOnline platform")
      .sort({ updatedAt: -1 })
      .lean();

    const groupIds = groupConversations.map((conversation) => conversation._id);
    const groupMessages =
      groupIds.length > 0
        ? await Message.find({ conversation: { $in: groupIds } })
            .sort({ createdAt: -1 })
            .limit(800)
            .populate("sender", "firstName lastName username jobTitle image isOnline platform")
            .lean()
        : [];

    const groupMessageState = new Map();
    groupMessages.forEach((message) => {
      const key = String(message.conversation);
      const existing = groupMessageState.get(key) || { lastMessage: null, unreadCount: 0 };
      const readAt = getGroupReadAt(message, userId);
      const hasUnread = Boolean(existing.unreadCount) || (!isSameId(message.sender?._id, userId) && !readAt);

      groupMessageState.set(key, {
        lastMessage: existing.lastMessage || mapMessage(message),
        unreadCount: hasUnread ? 1 : 0,
      });
    });

    groupConversations.forEach((conversation) => {
      const state = groupMessageState.get(String(conversation._id)) || {};
      conversations.set(`group:${conversation._id}`, {
        type: "group",
        group: mapGroup(conversation),
        lastMessage: state.lastMessage || null,
        unreadCount: state.unreadCount || 0,
      });
    });

    const sortedConversations = [...conversations.values()].sort((first, second) => {
      const firstTime = new Date(first.lastMessage?.createdAt || first.group?.updatedAt || 0).getTime();
      const secondTime = new Date(second.lastMessage?.createdAt || second.group?.updatedAt || 0).getTime();
      return secondTime - firstTime;
    });

    res.status(200).json({ data: sortedConversations });
  } catch (error) {
    console.error("Failed to load conversations:", error);
    res.status(500).json({ message: "Failed to load conversations" });
  }
};

const markGroupThreadRead = async ({ conversationId, userId }) => {
  const unreadMessages = await Message.find({
    conversation: conversationId,
    sender: { $ne: userId },
    "readBy.user": { $ne: userId },
  })
    .select("_id")
    .lean();

  if (unreadMessages.length === 0) return [];

  const readAt = new Date();
  const messageIds = unreadMessages.map((message) => message._id);

  await Message.updateMany(
    { _id: { $in: messageIds } },
    { $push: { readBy: { user: userId, readAt } } },
  );

  return { messageIds, readAt };
};

const getThread = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { otherUserId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ message: "Invalid conversation" });
    }

    const groupConversation = await Conversation.findOne({
      _id: otherUserId,
      members: userId,
    })
      .populate("members", "_id")
      .lean();

    if (groupConversation) {
      const readState = await markGroupThreadRead({
        conversationId: groupConversation._id,
        userId,
      });

      if (readState?.messageIds?.length > 0) {
        sendToUsers(
          groupConversation.members.map((member) => member._id),
          "chat:read",
          {
            conversationId: String(groupConversation._id),
            readerId: userId,
            messageIds: readState.messageIds.map(String),
            readAt: readState.readAt,
          },
        );
      }

      const messages = await Message.find({ conversation: groupConversation._id })
        .sort({ createdAt: 1 })
        .limit(300)
        .lean();

      return res.status(200).json({ data: messages.map(mapMessage) });
    }

    const otherUser = await User.findOne({
      _id: otherUserId,
      status: "active",
    })
      .select("_id")
      .lean();

    if (!otherUser) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const unreadMessages = await Message.find({
      conversation: { $exists: false },
      sender: otherUserId,
      recipient: userId,
      readAt: null,
    })
      .select("_id")
      .lean();

    if (unreadMessages.length > 0) {
      const readAt = new Date();
      const messageIds = unreadMessages.map((message) => message._id);

      await Message.updateMany({ _id: { $in: messageIds } }, { readAt });

      sendToUsers([otherUserId, userId], "chat:read", {
        readerId: userId,
        senderId: otherUserId,
        messageIds: messageIds.map(String),
        readAt,
      });
    }

    const messages = await Message.find({
      conversation: { $exists: false },
      $or: [
        { sender: userId, recipient: otherUserId },
        { sender: otherUserId, recipient: userId },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(300)
      .lean();

    return res.status(200).json({ data: messages.map(mapMessage) });
  } catch (error) {
    console.error("Failed to load messages:", error);
    res.status(500).json({ message: "Failed to load messages" });
  }
};

const validateBody = (body) => {
  const trimmedBody = String(body || "").trim();

  if (trimmedBody.length > 1000) {
    return { error: "Message is too long" };
  }

  return { value: trimmedBody };
};

const sendMessage = async (req, res) => {
  try {
    const senderId = getUserId(req);
    const { recipientId, conversationId, body } = req.body || {};
    const attachments = req.savedMessageAttachments || [];
    const bodyState = validateBody(body);

    if (bodyState.error) {
      return res.status(400).json({ message: bodyState.error });
    }

    if (!bodyState.value && attachments.length === 0) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    if (conversationId) {
      if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        return res.status(400).json({ message: "Select a valid group" });
      }

      const conversation = await Conversation.findOne({
        _id: conversationId,
        members: senderId,
      })
        .select("members name")
        .lean();

      if (!conversation) {
        return res.status(404).json({ message: "Group conversation not found" });
      }

      const message = await Message.create({
        sender: senderId,
        conversation: conversationId,
        body: bodyState.value,
        attachments,
        readBy: [{ user: senderId, readAt: new Date() }],
      });

      const payload = mapMessage(message.toObject());
      sendToUsers(conversation.members, "chat:message", payload);
      notifyUnreadMessageSummary(
        conversation.members.filter((memberId) => !isSameId(memberId, senderId)),
      ).catch((error) => {
        console.error("Message push notification failed:", error);
      });

      auditLog(`Message sent to group: ${conversation.name}`, senderId).catch((error) => {
        console.error("Message audit failed:", error);
      });

      return res.status(201).json({ data: payload });
    }

    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({ message: "Select a valid recipient" });
    }

    if (isSameId(senderId, recipientId)) {
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
      body: bodyState.value,
      attachments,
    });

    const payload = mapMessage(message.toObject());
    sendToUsers([senderId, recipientId], "chat:message", payload);
    notifyUnreadMessageSummary([recipientId]).catch((error) => {
      console.error("Message push notification failed:", error);
    });

    auditLog(`Message sent to user: ${recipientId}`, senderId).catch((error) => {
      console.error("Message audit failed:", error);
    });

    return res.status(201).json({ data: payload });
  } catch (error) {
    console.error("Failed to send message:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
};

const createGroupConversation = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { name, memberIds = [] } = req.body || {};
    const trimmedName = String(name || "").trim();

    if (!trimmedName) {
      return res.status(400).json({ message: "Group name is required" });
    }

    if (trimmedName.length > 80) {
      return res.status(400).json({ message: "Group name is too long" });
    }

    const uniqueMemberIds = [
      ...new Set([userId, ...memberIds].filter((id) => mongoose.Types.ObjectId.isValid(id)).map(String)),
    ];

    if (uniqueMemberIds.length < 2) {
      return res.status(400).json({ message: "Select at least one group member" });
    }

    const activeUsers = await User.find({
      _id: { $in: uniqueMemberIds },
      status: "active",
    })
      .select("_id")
      .lean();
    const activeMemberIds = activeUsers.map((item) => item._id);

    if (activeMemberIds.length < 2 || !activeMemberIds.some((id) => isSameId(id, userId))) {
      return res.status(400).json({ message: "Select valid group members" });
    }

    const conversation = await Conversation.create({
      name: trimmedName,
      members: activeMemberIds,
      createdBy: userId,
    });

    const populatedConversation = await Conversation.findById(conversation._id)
      .populate("members", "firstName lastName username jobTitle image isOnline platform")
      .lean();

    const payload = {
      type: "group",
      group: mapGroup(populatedConversation),
      lastMessage: null,
      unreadCount: 0,
    };

    sendToUsers(activeMemberIds, "chat:conversation", payload);

    auditLog(`Group chat created: ${trimmedName}`, userId).catch((error) => {
      console.error("Group chat audit failed:", error);
    });

    return res.status(201).json({ data: payload });
  } catch (error) {
    console.error("Failed to create group conversation:", error);
    res.status(500).json({ message: "Failed to create group chat" });
  }
};

module.exports = {
  getMessageUsers,
  getConversations,
  createGroupConversation,
  getThread,
  sendMessage,
};
