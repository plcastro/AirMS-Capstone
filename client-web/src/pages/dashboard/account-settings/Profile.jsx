import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Card,
  Typography,
  Button,
  Row,
  Col,
  Tabs,
  Popconfirm,
  Descriptions,
  Space,
  Slider,
  Switch,
  InputNumber,
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
import ResultPopup from "../../../components/common/ResultPopup";
import UserAvatar from "../../../components/common/UserAvatar";
const { Title, Text } = Typography;

export default function Profile() {
  const { user, setUser, getValidToken } = useContext(AuthContext);
  const [file, setFile] = useState(null);
  const [previewUri, setPreviewUri] = useState("");
  const fileInputRef = useRef(null);
  const [fontScalePreference, setFontScalePreference] = useState(1);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [
    aircraftFhDueNotificationsEnabled,
    setAircraftFhDueNotificationsEnabled,
  ] = useState(false);
  const [aircraftFhDueThreshold, setAircraftFhDueThreshold] = useState(25);
  const [browserPermission, setBrowserPermission] = useState("default");
  const [popup, setPopup] = useState({
    open: false,
    status: "success",
    title: "",
    subTitle: "",
  });

  const WEB_SETTINGS_KEY = "webProfileSettings";

  const WEB_FONT_RECOMMENDED = 1;
  const WEB_FONT_MAX = 1.3;
  const userId = user?.id || user?._id;

  const persistUser = (nextUser) => {
    setUser(nextUser);
    try {
      const storedKeys = ["currentUser"];
      storedKeys.forEach((key) => {
        if (sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, JSON.stringify(nextUser));
        }
        if (localStorage.getItem(key)) {
          localStorage.setItem(key, JSON.stringify(nextUser));
        }
      });
    } catch {
      // Storage persistence is best-effort; React state remains the source for this session.
    }
  };

  const applyWebFontSize = (scale = WEB_FONT_RECOMMENDED) => {
    const clamped = Math.min(
      Math.max(Number(scale) || WEB_FONT_RECOMMENDED, WEB_FONT_RECOMMENDED),
      WEB_FONT_MAX,
    );
    document.documentElement.style.fontSize = `${(16 * clamped).toFixed(1)}px`;
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

    const imageUrl = user.image || "";
    setPreviewUri(imageUrl);
    setFile(null);
  }, [user]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(WEB_SETTINGS_KEY) || "{}");
      const storedFont = stored.fontSizePreference;
      const nextFont =
        typeof storedFont === "number"
          ? storedFont
          : {
              small: 0.9,
              medium: 1,
              large: 1.1,
            }[storedFont] || WEB_FONT_RECOMMENDED;
      const supportsBrowserNotifications =
        typeof window !== "undefined" && "Notification" in window;
      const nextNotifications =
        typeof stored.notificationsEnabled === "boolean"
          ? stored.notificationsEnabled && supportsBrowserNotifications
          : false;
      const nextFhDueNotifications =
        typeof stored.aircraftFhDueNotificationsEnabled === "boolean"
          ? stored.aircraftFhDueNotificationsEnabled
          : false;
      const nextFhDueThreshold =
        typeof stored.aircraftFhDueThreshold === "number"
          ? stored.aircraftFhDueThreshold
          : 25;
      setFontScalePreference(nextFont);
      setNotificationsEnabled(nextNotifications);
      setAircraftFhDueNotificationsEnabled(nextFhDueNotifications);
      setAircraftFhDueThreshold(nextFhDueThreshold);
      applyWebFontSize(nextFont);
    } catch {
      setFontScalePreference(WEB_FONT_RECOMMENDED);
      setNotificationsEnabled(false);
      setAircraftFhDueNotificationsEnabled(false);
      setAircraftFhDueThreshold(25);
      applyWebFontSize(WEB_FONT_RECOMMENDED);
    }

    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserPermission(window.Notification.permission);
    }
  }, []);

  const persistWebSettings = (next) => {
    let stored = {};
    try {
      stored = JSON.parse(localStorage.getItem(WEB_SETTINGS_KEY) || "{}");
    } catch {
      stored = {};
    }

    const payload = {
      ...stored,
      fontSizePreference:
        next.fontSizePreference ?? fontScalePreference ?? WEB_FONT_RECOMMENDED,
      notificationsEnabled:
        typeof next.notificationsEnabled === "boolean"
          ? next.notificationsEnabled
          : notificationsEnabled,
      aircraftFhDueNotificationsEnabled:
        typeof next.aircraftFhDueNotificationsEnabled === "boolean"
          ? next.aircraftFhDueNotificationsEnabled
          : aircraftFhDueNotificationsEnabled,
      aircraftFhDueThreshold:
        typeof next.aircraftFhDueThreshold === "number"
          ? next.aircraftFhDueThreshold
          : aircraftFhDueThreshold,
    };
    localStorage.setItem(WEB_SETTINGS_KEY, JSON.stringify(payload));
    window.dispatchEvent(new Event("web-settings-updated"));
  };

  const pickImage = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setPreviewUri(URL.createObjectURL(selectedFile));
  };

  const handleSaveImage = async () => {
    if (!file) return;
    if (!userId) {
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: "Unable to update image: user ID is missing.",
      });
      return;
    }

    const formData = new FormData();
    formData.append("image", file);
    formData.append("confirmAction", "true");

    try {
      const res = await fetch(
        `${API_BASE}/api/user/update-user-image/${userId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${await getValidToken()}`,
            "x-action-confirmed": "true",
          },
          body: formData,
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to upload");

      const nextUser = {
        ...user,
        ...data.user,
        id: data?.user?.id || data?.user?._id || userId,
      };
      persistUser(nextUser);
      const uploadedImagePath = data?.user?.image || "";
      setPreviewUri(uploadedImagePath || "");
      setFile(null);
      setPopup({
        open: true,
        status: "success",
        title: "Image Updated!",
        subTitle: "Your profile image has been updated successfully.",
      });
    } catch {
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: "Failed to update profile image.",
      });
    }
  };

  const handleRemoveImage = async () => {
    if (!userId) {
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: "Unable to remove image: user ID is missing.",
      });
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/user/update-user-image/${userId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${await getValidToken()}`,
            "x-action-confirmed": "true",
          },
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to remove image");

      persistUser({
        ...user,
        ...data.user,
        id: data?.user?.id || data?.user?._id || userId,
        image: "",
      });
      setPreviewUri("");
      setFile(null);

      setPopup({
        open: true,
        status: "success",
        title: "Image Removed!",
        subTitle: "Profile picture removed successfully.",
      });
    } catch (err) {
      console.error("Error removing profile image:", err);
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: "Failed to remove profile image.",
      });
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
              <Text type="secondary">
                Range: Recommended ({WEB_FONT_RECOMMENDED.toFixed(2)}x) to Max (
                {WEB_FONT_MAX.toFixed(2)}x)
              </Text>
              <Slider
                min={WEB_FONT_RECOMMENDED}
                max={WEB_FONT_MAX}
                step={0.05}
                value={fontScalePreference}
                onChange={(value) => {
                  setFontScalePreference(value);
                  applyWebFontSize(value);
                }}
                onChangeComplete={(value) => {
                  persistWebSettings({ fontSizePreference: value });
                }}
                style={{ maxWidth: 320 }}
              />
              <Text type="secondary">
                Current: {fontScalePreference.toFixed(2)}x
              </Text>
            </Space>
          </Card>

          <Card size="small" title="Notifications">
            <Space orientation="vertical" size={12} style={{ width: "100%" }}>
              <Space>
                <Text strong>Enable Browser Notifications</Text>
                <Switch
                  checked={notificationsEnabled}
                  onChange={async (checked) => {
                    if (
                      checked &&
                      (typeof window === "undefined" ||
                        !("Notification" in window))
                    ) {
                      setNotificationsEnabled(false);
                      persistWebSettings({ notificationsEnabled: false });
                      setPopup({
                        open: true,
                        status: "error",
                        title: "Operation failed!",
                        subTitle:
                          "Browser notifications are not supported in this browser.",
                      });
                      return;
                    }

                    if (checked) {
                      const permission =
                        await window.Notification.requestPermission();
                      setBrowserPermission(permission);
                      if (permission !== "granted") {
                        setNotificationsEnabled(false);
                        persistWebSettings({ notificationsEnabled: false });
                        setPopup({
                          open: true,
                          status: "error",
                          title: "Operation failed!",
                          subTitle:
                            permission === "denied"
                              ? "Browser notification permission is blocked. Enable it in your browser site settings first."
                              : "Notification permission was not granted by the browser.",
                        });
                        return;
                      }
                    }

                    setNotificationsEnabled(checked);
                    persistWebSettings({ notificationsEnabled: checked });
                    setPopup({
                      open: true,
                      status: "success",
                      title: "Settings Updated!",
                      subTitle:
                        "Your notification preference has been saved successfully.",
                    });
                  }}
                />
              </Space>
              <Text type="secondary">
                AirMS notifications:{" "}
                <strong>{notificationsEnabled ? "Enabled" : "Disabled"}</strong>
              </Text>
              <Text type="secondary">
                Browser permission available:{" "}
                <strong>
                  {browserPermission === "granted"
                    ? "Granted"
                    : browserPermission === "denied"
                      ? "Denied"
                      : "Default"}
                </strong>
              </Text>

              <Space wrap align="center">
                <Text strong>Aircraft FH Due Alerts</Text>
                <Switch
                  checked={aircraftFhDueNotificationsEnabled}
                  onChange={(checked) => {
                    setAircraftFhDueNotificationsEnabled(checked);
                    persistWebSettings({
                      aircraftFhDueNotificationsEnabled: checked,
                    });
                    setPopup({
                      open: true,
                      status: "success",
                      title: "Settings Updated!",
                      subTitle: checked
                        ? "Aircraft FH due alerts have been enabled."
                        : "Aircraft FH due alerts have been disabled.",
                    });
                  }}
                />
              </Space>
              <Space wrap align="center">
                <Text type="secondary">Notify within</Text>
                <InputNumber
                  min={1}
                  max={500}
                  step={1}
                  precision={0}
                  value={aircraftFhDueThreshold}
                  disabled={!aircraftFhDueNotificationsEnabled}
                  addonAfter="FH"
                  onChange={(value) => {
                    const nextValue = Number(value) || 1;
                    setAircraftFhDueThreshold(nextValue);
                    persistWebSettings({ aircraftFhDueThreshold: nextValue });
                  }}
                  style={{ width: 140 }}
                />
              </Space>
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
                      <UserAvatar
                        image={previewUri || user?.image}
                        firstName={user?.firstName}
                        lastName={user?.lastName}
                        size={172}
                        style={{ cursor: "pointer", fontSize: 48 }}
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
      <ResultPopup
        open={popup.open}
        status={popup.status}
        title={popup.title}
        subTitle={popup.subTitle}
        onClose={() => setPopup((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
