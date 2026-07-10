import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Modal,
  Avatar,
  Typography,
  Button,
  Space,
  Tag,
  Empty,
  Spin,
  message,
  notification as antdNotification,
} from "antd";
import { BellOutlined } from "@ant-design/icons";
import { AuthContext } from "../../context/AuthContext";
import { API_BASE } from "../../utils/API_BASE";

const { Text } = Typography;

export default function PushNotificationsCard({ open, onClose }) {
  const { getAuthHeader, getValidToken, user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const reconnectTimeoutRef = useRef(null);
  const websocketRef = useRef(null);

  const formatTimeAgo = (dateValue) => {
    const parsedDate = new Date(dateValue);

    if (Number.isNaN(parsedDate.getTime())) {
      return "";
    }

    const diffInSeconds = Math.floor(
      (Date.now() - parsedDate.getTime()) / 1000,
    );

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

  const fetchNotifications = useCallback(
    async ({ silent = false } = {}) => {
      if (!user?.id) {
        setNotifications([]);
        return;
      }

      try {
        if (!silent) {
          setLoading(true);
        }
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
        if (!silent) {
          message.error("Failed to load notifications");
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [getAuthHeader, user?.id],
  );

  const sortedNotifications = useMemo(
    () =>
      [...notifications].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      ),
    [notifications],
  );

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [fetchNotifications, open]);

  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }

    let isMounted = true;

    const getWebSocketUrl = (token) => {
      const wsBase = String(API_BASE || "")
        .replace(/\/+$/, "")
        .replace(/^http/i, (match) =>
          match.toLowerCase() === "https" ? "wss" : "ws",
        );
      return `${wsBase}/ws?token=${encodeURIComponent(token)}`;
    };

    const connect = async () => {
      try {
        const token = await getValidToken();

        if (!token || !isMounted) {
          return;
        }

        const socket = new WebSocket(getWebSocketUrl(token));
        websocketRef.current = socket;

        socket.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);

            if (payload?.event !== "notification-created") {
              return;
            }

            fetchNotifications({ silent: true });

            const notification = payload.data || {};
            antdNotification.info({
              message: notification.title || "New notification",
              description:
                notification.description ||
                "You have a new AirMS notification.",
              placement: "topRight",
            });
          } catch (error) {
            console.error("Notification websocket parse error:", error);
          }
        };

        socket.onclose = () => {
          if (!isMounted) {
            return;
          }

          reconnectTimeoutRef.current = setTimeout(connect, 5000);
        };
      } catch (error) {
        console.error("Notification websocket error:", error);
        if (isMounted) {
          reconnectTimeoutRef.current = setTimeout(connect, 5000);
        }
      }
    };

    fetchNotifications({ silent: true });
    connect();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeoutRef.current);
      websocketRef.current?.close?.();
    };
  }, [fetchNotifications, getValidToken, user?.id]);

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
      const response = await fetch(
        `${API_BASE}/api/notifications/mark-all-read`,
        {
          method: "POST",
          headers: await getAuthHeader(),
        },
      );

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

    if (moduleName === "pre-inspections") {
      const status = notification?.metadata?.status || "";
      const params = new URLSearchParams({
        refreshAt: String(Date.now()),
        targetPreInspectionId: String(notification.entityId || ""),
        ...(status ? { notificationStatus: status } : {}),
      });

      window.location.assign(`/dashboard/pre-inspection?${params.toString()}`);
      return;
    }

    if (moduleName === "post-inspections") {
      const status = notification?.metadata?.status || "";
      const params = new URLSearchParams({
        refreshAt: String(Date.now()),
        targetPostInspectionId: String(notification.entityId || ""),
        ...(status ? { notificationStatus: status } : {}),
      });

      window.location.assign(`/dashboard/post-inspection?${params.toString()}`);
      return;
    }

    if (moduleName === "tasks") {
      const status = notification?.metadata?.status || "";
      const params = new URLSearchParams({
        refreshAt: String(Date.now()),
        targetTaskId: String(notification.entityId || ""),
        ...(status ? { notificationStatus: status } : {}),
      });

      window.location.assign(`/dashboard/tasks?${params.toString()}`);
      return;
    }

    if (moduleName === "messages") {
      window.location.assign(`/dashboard/messages?refreshAt=${Date.now()}`);
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
      <div>
        {sortedNotifications.map((item) => (
          <div
            key={item._id}
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
            <Space align="start" size={12} style={{ width: "100%" }}>
              <Avatar
                icon={<BellOutlined />}
                style={{
                  backgroundColor: item.read ? "#d9d9d9" : "#52c41a",
                }}
              />
              <div style={{ flex: 1 }}>
                <Space>
                  <Text strong={!item.read}>{item.title}</Text>
                  {!item.read && <Tag color="green">New</Tag>}
                </Space>
                <div>
                  <Text type="secondary">{item.description}</Text>
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {formatTimeAgo(item.createdAt)}
                </Text>
              </div>
            </Space>
          </div>
        ))}
      </div>
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
