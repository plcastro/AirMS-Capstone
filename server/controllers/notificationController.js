const NotificationModel = require("../models/notificationModel");
const UserModel = require("../models/userModel");
const mongoose = require("mongoose");

const normalizeRole = (role = "") => role.trim().toLowerCase();

const getUserRole = async (userId, tokenRole = "") => {
  const normalizedTokenRole = normalizeRole(tokenRole);

  if (normalizedTokenRole) {
    return normalizedTokenRole;
  }

  const user = await UserModel.findById(userId).select("jobTitle");
  return normalizeRole(user?.jobTitle || "");
};

const buildRecipientQuery = (userId, role) => {
  const recipientFilters = [];

  if (mongoose.Types.ObjectId.isValid(userId)) {
    recipientFilters.push({ recipientUsers: userId });
  }

  if (role) {
    recipientFilters.push({ recipientRoles: role });
  }

  return { $or: recipientFilters };
};

const getNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const role = await getUserRole(userId, req.user?.jobTitle);
    const recipientQuery = buildRecipientQuery(userId, role);

    if (recipientQuery.$or.length === 0) {
      return res.status(200).json([]);
    }

    const notifications = await NotificationModel.find(
      recipientQuery,
    )
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const mappedNotifications = notifications.map((notification) => ({
      ...notification,
      read: (notification.readBy || []).some(
        (readerId) => String(readerId) === String(userId),
      ),
    }));

    res.status(200).json(mappedNotifications);
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const role = await getUserRole(userId, req.user?.jobTitle);
    const recipientQuery = buildRecipientQuery(userId, role);

    if (recipientQuery.$or.length === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }

    const notification = await NotificationModel.findOneAndUpdate(
      {
        _id: req.params.id,
        ...recipientQuery,
      },
      {
        $addToSet: { readBy: userId },
      },
      { new: true },
    ).lean();

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Failed to update notification:", error);
    res.status(500).json({ message: "Failed to update notification" });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const role = await getUserRole(userId, req.user?.jobTitle);
    const recipientQuery = buildRecipientQuery(userId, role);

    if (recipientQuery.$or.length === 0) {
      return res.status(200).json({ success: true });
    }

    await NotificationModel.updateMany(
      recipientQuery,
      {
        $addToSet: { readBy: userId },
      },
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Failed to update notifications:", error);
    res.status(500).json({ message: "Failed to update notifications" });
  }
};

module.exports = {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
