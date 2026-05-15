import React, { useContext, useEffect, useRef, useState } from "react";
import {
  App,
  Card,
  Typography,
  Button,
  Input,
  Row,
  Col,
  Tabs,
  Popconfirm,
  Descriptions,
  Avatar,
  Space,
  Select,
  Switch,
} from "antd";
import {
  LockOutlined,
  UserOutlined,
  DeleteOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { AuthContext } from "../../../context/AuthContext";
import { API_BASE } from "../../../utils/API_BASE";
import UpdateSecurity from "./UpdateSecurity";
import DefaultAvatar from "../../../assets/images/default_avatar.jpg";
const { Title, Text } = Typography;

export default function Profile() {
  const { message } = App.useApp();
  const { user, setUser, getValidToken } = useContext(AuthContext);
  const [file, setFile] = useState(null);
  const [previewUri, setPreviewUri] = useState("");
  const fileInputRef = useRef(null);
  const [fontSizePreference, setFontSizePreference] = useState("medium");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [browserPermission, setBrowserPermission] = useState("default");
  const WEB_SETTINGS_KEY = "webProfileSettings";

  const applyWebFontSize = (preference) => {
    const map = {
      small: "14px",
      medium: "16px",
      large: "18px",
    };
    document.documentElement.style.fontSize = map[preference] || map.medium;
  };
  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    if (!user) return;

    const imageUrl = user.image
      ? user.image.startsWith("http")
        ? user.image
        : `${API_BASE}${user.image}`
      : DefaultAvatar;
    setPreviewUri(imageUrl);
    setFile(null);
  }, [user]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(WEB_SETTINGS_KEY) || "{}");
      const nextFont = stored.fontSizePreference || "medium";
      const nextNotifications =
        typeof stored.notificationsEnabled === "boolean"
          ? stored.notificationsEnabled
          : true;
      setFontSizePreference(nextFont);
      setNotificationsEnabled(nextNotifications);
      applyWebFontSize(nextFont);
    } catch {
      setFontSizePreference("medium");
      setNotificationsEnabled(true);
      applyWebFontSize("medium");
    }

    if (typeof Notification !== "undefined") {
      setBrowserPermission(Notification.permission);
    }
  }, []);

  const persistWebSettings = (next) => {
    const payload = {
      fontSizePreference:
        next.fontSizePreference ?? fontSizePreference ?? "medium",
      notificationsEnabled:
        typeof next.notificationsEnabled === "boolean"
          ? next.notificationsEnabled
          : notificationsEnabled,
    };
    localStorage.setItem(WEB_SETTINGS_KEY, JSON.stringify(payload));
  };

  const pickImage = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setPreviewUri(URL.createObjectURL(selectedFile));
  };

  const handleSaveImage = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch(
        `${API_BASE}/api/user/update-user-image/${user.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${await getValidToken()}`,
          },
          body: formData,
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to upload");

      setUser((prev) => ({
        ...prev,
        ...data.user,
        id: data?.user?.id || data?.user?._id || prev?.id,
      }));
      const uploadedImagePath =
        data?.user?.image && data.user.image.startsWith("http")
          ? data.user.image
          : `${API_BASE}${data?.user?.image || ""}`;
      setPreviewUri(uploadedImagePath || DefaultAvatar);
      setFile(null);
      message.success("Image updated!");
    } catch (err) {
      message.error(err.message);
    }
  };

  const handleRemoveImage = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/user/update-user-image/${user.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${await getValidToken()}`,
          },
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to remove image");

      setUser((prev) => ({ ...prev, image: "" }));
      setPreviewUri(DefaultAvatar);
      setFile(null);

      message.success("Profile picture removed!");
    } catch (err) {
      console.error("Error removing profile image:", err);
      message.error(err.message || "Image removal failed");
    }
  };

  const tabItems = [
    {
      key: "UserInformation",
      label: "User Information",
      icon: <UserOutlined />,
      children: (
        <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="First Name">
            {user.firstName}
          </Descriptions.Item>
          <Descriptions.Item label="Last Name">
            {user.lastName}
          </Descriptions.Item>
          <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
          <Descriptions.Item label="Username">
            {user.username}
          </Descriptions.Item>
          <Descriptions.Item label="Job Title">
            {user?.jobTitle
              ? user.jobTitle
                  .split(" ")
                  .map(
                    (word) =>
                      word.charAt(0).toUpperCase() +
                      word.slice(1).toLowerCase(),
                  )
                  .join(" ")
              : "Unknown Job Title"}
          </Descriptions.Item>
          <Descriptions.Item label="Last Login">
            {formatDate(user.lastLogin)}
          </Descriptions.Item>
        </Descriptions>
      ),
    },
    {
      key: "SecurityInformation",
      label: "Security",
      icon: <LockOutlined />,
      children: <UpdateSecurity />,
    },
    {
      key: "AppSettings",
      label: "Settings",
      icon: <SettingOutlined />,
      children: (
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
          <Card size="small" title="Display">
            <Space orientation="vertical" style={{ width: "100%" }}>
              <Text strong>Font Size</Text>
              <Select
                value={fontSizePreference}
                onChange={(value) => {
                  setFontSizePreference(value);
                  applyWebFontSize(value);
                  persistWebSettings({ fontSizePreference: value });
                  message.success("Font size preference saved.");
                }}
                options={[
                  { label: "Small", value: "small" },
                  { label: "Medium", value: "medium" },
                  { label: "Large", value: "large" },
                ]}
                style={{ maxWidth: 260 }}
              />
            </Space>
          </Card>

          <Card size="small" title="Notifications">
            <Space orientation="vertical" size={12} style={{ width: "100%" }}>
              <Space>
                <Text strong>Enable Browser Notifications</Text>
                <Switch
                  checked={notificationsEnabled}
                  onChange={async (checked) => {
                    if (checked && typeof Notification !== "undefined") {
                      const permission = await Notification.requestPermission();
                      setBrowserPermission(permission);
                      if (permission !== "granted") {
                        setNotificationsEnabled(false);
                        persistWebSettings({ notificationsEnabled: false });
                        message.warning(
                          "Notification permission not granted by browser.",
                        );
                        return;
                      }
                    }

                    setNotificationsEnabled(checked);
                    persistWebSettings({ notificationsEnabled: checked });
                    message.success("Notification preference saved.");
                  }}
                />
              </Space>
              <Text type="secondary">
                Browser permission:{" "}
                <strong>
                  {browserPermission === "granted"
                    ? "Granted"
                    : browserPermission === "denied"
                      ? "Denied"
                      : "Default"}
                </strong>
              </Text>
            </Space>
          </Card>
        </Space>
      ),
    },
  ];

  if (!user) return null;

  return (
    <div style={{ padding: 24, minHeight: "calc(100vh - 64px)" }}>
      <Row justify="center">
        <Col xs={24} style={{ maxWidth: 1200 }}>
          <Card>
            <Space
              orientation="vertical"
              size="large"
              style={{ width: "100%" }}
            >
              <Space orientation="vertical" size={4}>
                <Title level={3} style={{ margin: 0 }}>
                  Profile Settings
                </Title>
                <Text type="secondary">
                  Manage your profile details, picture, and security
                  preferences.
                </Text>
              </Space>

              <Row gutter={[24, 24]}>
                <Col xs={24} md={10}>
                  <Card size="small" title="Profile Picture">
                    <Space
                      orientation="vertical"
                      size={24}
                      style={{ width: "100%", alignItems: "center" }}
                    >
                      <Avatar
                        src={previewUri || DefaultAvatar}
                        size={172}
                        style={{ cursor: "pointer" }}
                        onClick={() => fileInputRef.current?.click()}
                      />
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        onChange={pickImage}
                      />
                      <Space wrap>
                        <Button
                          type="primary"
                          onClick={() =>
                            file
                              ? handleSaveImage()
                              : fileInputRef.current.click()
                          }
                        >
                          {file ? "Save Picture" : "Change Picture"}
                        </Button>
                        <Popconfirm
                          title="Delete image"
                          description="Are you sure you want to delete your image?"
                          onConfirm={handleRemoveImage}
                          okText="Yes"
                          cancelText="No"
                        >
                          <Button danger disabled={!user?.image && !file}>
                            <DeleteOutlined />
                          </Button>
                        </Popconfirm>
                      </Space>
                    </Space>
                  </Card>
                </Col>

                <Col xs={24} md={14}>
                  <Card size="small">
                    <Tabs
                      centered
                      defaultActiveKey={tabItems[0]?.key || "UserInformation"}
                      items={tabItems}
                      size="medium"
                    />
                  </Card>
                </Col>
              </Row>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
