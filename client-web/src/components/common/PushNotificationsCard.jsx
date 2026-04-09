import React from "react";
import {
  Modal,
  List,
  Avatar,
  Typography,
  Button,
  Space,
  Tag,
  Empty,
} from "antd";
import { BellOutlined } from "@ant-design/icons";

const { Text } = Typography;

export default function PushNotificationsCard({ open, onClose }) {
  // MOCK DATA (replace with real data)
  const notifications = [
    {
      id: 1,
      title: "New Request Submitted",
      description: "A new WRS request has been created.",
      time: "2 mins ago",
      read: false,
    },
    {
      id: 2,
      title: "Stock Updated",
      description: "Inventory for Item #123 has been updated.",
      time: "10 mins ago",
      read: true,
    },
    {
      id: 3,
      title: "Maintenance Alert",
      description: "Scheduled maintenance due tomorrow.",
      time: "1 hour ago",
      read: false,
    },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  const renderNotificationsList = () => {
    if (!notifications.length) {
      return <Empty description="No notifications" />;
    }

    return (
      <List
        itemLayout="horizontal"
        dataSource={notifications}
        renderItem={(item) => (
          <List.Item
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
                    {item.time}
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
        <Button type="link">Mark all as read</Button>
        <Button danger type="link">
          Clear all
        </Button>
      </div>
    </Modal>
  );
}
