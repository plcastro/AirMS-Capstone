const NotificationModel = require("../models/notificationModel");
const UserModel = require("../models/userModel");
const mongoose = require("mongoose");

const normalizeRole = (role = "") => String(role || "").trim().toLowerCase();

const getUserRole = async (userId, fallbackRole = "") => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return normalizeRole(fallbackRole);
  }

  const user = await UserModel.findById(userId).select("jobTitle");
  return normalizeRole(user?.jobTitle || fallbackRole);
};

const buildRecipientQuery = (userId, role) => ({
  $or: [{ recipientUsers: userId }, ...(role ? [{ recipientRoles: role }] : [])],
});

const getNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const role = await getUserRole(userId, req.user?.jobTitle);
    const notifications = await NotificationModel.find(
      buildRecipientQuery(userId, role),
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
    const notification = await NotificationModel.findOneAndUpdate(
      {
        _id: req.params.id,
        ...buildRecipientQuery(userId, role),
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
    await NotificationModel.updateMany(
      buildRecipientQuery(userId, role),
      {
        $addToSet: { readBy: userId },
      },
    );

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to update notifications" });
  }
};

module.exports = {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
