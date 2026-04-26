import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Modal,
  List,
  Avatar,
  Typography,
  Button,
  Space,
  Tag,
  Empty,
  Spin,
  message,
} from "antd";
import { BellOutlined } from "@ant-design/icons";
import { AuthContext } from "../../context/AuthContext";
import { API_BASE } from "../../utils/API_BASE";

const { Text } = Typography;

export default function PushNotificationsCard({ open, onClose }) {
  const { getAuthHeader, user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const formatTimeAgo = (dateValue) => {
    const parsedDate = new Date(dateValue);

    if (Number.isNaN(parsedDate.getTime())) {
      return "";
    }

    const diffInSeconds = Math.floor((Date.now() - parsedDate.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return "Just now";
    }

    if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)} min ago`;
    }

    if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)} hr ago`;
    }

    return parsedDate.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const fetchNotifications = async () => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/notifications`, {
        headers: await getAuthHeader(),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await response.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
      message.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const sortedNotifications = useMemo(
    () =>
      [...notifications].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      ),
    [notifications],
  );

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open]);

  const markNotificationRead = async (notificationId) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/notifications/${notificationId}/read`,
        {
          method: "POST",
          headers: await getAuthHeader(),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to mark notification as read");
      }

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) =>
          notification._id === notificationId
            ? { ...notification, read: true }
            : notification,
        ),
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
      message.error("Failed to mark notification as read");
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/notifications/mark-all-read`, {
        method: "POST",
        headers: await getAuthHeader(),
      });

      if (!response.ok) {
        throw new Error("Failed to mark all notifications as read");
      }

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => ({
          ...notification,
          read: true,
        })),
      );
      message.success("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      message.error("Failed to mark all notifications as read");
    }
  };

  const handleNotificationClick = async (notification) => {
    await markNotificationRead(notification._id);
    onClose?.();

    const moduleName = notification?.module || notification?.metadata?.module;

    if (moduleName === "flight-logs") {
      const status = notification?.metadata?.status || "";
      const params = new URLSearchParams({
        refreshAt: String(Date.now()),
        targetFlightLogId: String(notification.entityId || ""),
        ...(status ? { notificationStatus: status } : {}),
      });

      window.location.assign(`/dashboard/flight-log?${params.toString()}`);
      return;
    }

    window.location.assign(
      `/dashboard/parts-requisition?refreshAt=${Date.now()}&targetRequestId=${notification.entityId}`,
    );
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const renderNotificationsList = () => {
    if (loading) {
      return (
        <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
          <Spin />
        </div>
      );
    }

    if (!sortedNotifications.length) {
      return <Empty description="No notifications" />;
    }

    return (
      <List
        itemLayout="horizontal"
        dataSource={sortedNotifications}
        renderItem={(item) => (
          <List.Item
            onClick={() => handleNotificationClick(item)}
            style={{
              padding: "12px 16px",
              background: item.read ? "#fff" : "#f6ffed",
              borderRadius: 8,
              marginBottom: 8,
              cursor: "pointer",
              transition: "0.2s",
            }}
          >
            <List.Item.Meta
              avatar={
                <Avatar
                  icon={<BellOutlined />}
                  style={{
                    backgroundColor: item.read ? "#d9d9d9" : "#52c41a",
                  }}
                />
              }
              title={
                <Space>
                  <Text strong={!item.read}>{item.title}</Text>
                  {!item.read && <Tag color="green">New</Tag>}
                </Space>
              }
              description={
                <>
                  <Text type="secondary">{item.description}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {formatTimeAgo(item.createdAt)}
                  </Text>
                </>
              }
            />
          </List.Item>
        )}
      />
    );
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={500}
      title={
        <Space>
          <BellOutlined />
          Notifications
          <Tag color="blue">{unreadCount} Unread</Tag>
        </Space>
      }
    >
      <div
        style={{
          maxHeight: "400px",
          overflowY: "auto",
          paddingRight: 4,
        }}
      >
        {renderNotificationsList()}
      </div>

      <div
        style={{
          marginTop: 16,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Button type="link" onClick={markAllAsRead}>
          Mark all as read
        </Button>
        <Button danger type="link" onClick={fetchNotifications}>
          Refresh
        </Button>
      </div>
    </Modal>
  );
}
