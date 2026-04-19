import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Card,
  Typography,
  Button,
  Input,
  Form,
  Row,
  Col,
  Tabs,
  message,
  Popconfirm,
  Descriptions,
  Avatar,
  Space,
} from "antd";
import {
  EditOutlined,
  LockOutlined,
  UserOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { AuthContext } from "../../../context/AuthContext";
import { API_BASE } from "../../../utils/API_BASE";
import UpdateSecurity from "./UpdateSecurity";
import DefaultAvatar from "../../../assets/images/default_avatar.jpg";
const { Title, Text } = Typography;

export default function Profile() {
  const { user, setUser, getValidToken } = useContext(AuthContext);
  const [form] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ firstName: "", lastName: "" });
  const [file, setFile] = useState(null);
  const [previewUri, setPreviewUri] = useState("");
  const fileInputRef = useRef(null);
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

    setFormData({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
    });

    const imageUrl = user.image
      ? user.image.startsWith("http")
        ? user.image
        : `${API_BASE}${user.image}`
      : DefaultAvatar;
    setPreviewUri(imageUrl);
    setFile(null);
  }, [user]);

  const handleChange = (key, value) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const pickImage = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setPreviewUri(URL.createObjectURL(selectedFile));
  };

  const handleSaveProfile = async () => {
    try {
      if (
        formData.firstName !== user.firstName ||
        formData.lastName !== user.lastName
      ) {
        const res = await fetch(
          `${API_BASE}/api/user/update-user-profile/${user.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${await getValidToken()}`,
            },
            body: JSON.stringify(formData),
          },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
      }

      setUser((prev) => ({
        ...prev,
        firstName: formData.firstName,
        lastName: formData.lastName,
      }));

      setIsEditing(false);
      message.success("Profile updated successfully!");
    } catch (err) {
      console.error(err);
      message.error(err.message || "Profile update failed");
    }
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
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await getValidToken()}`,
          },
          body: JSON.stringify({ image: null }),
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to remove image");

      setUser((prev) => ({ ...prev, image: null }));
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
        <Form layout="vertical" form={form}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={24}>
              {isEditing ? (
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <Form.Item label="First Name">
                      <Input
                        value={formData.firstName}
                        size="large"
                        onChange={(e) =>
                          handleChange("firstName", e.target.value)
                        }
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="Last Name">
                      <Input
                        value={formData.lastName}
                        size="large"
                        onChange={(e) =>
                          handleChange("lastName", e.target.value)
                        }
                      />
                    </Form.Item>
                  </Col>
                </Row>
              ) : (
                <Descriptions bordered column={1} size="small">
                  <Descriptions.Item label="First Name">
                    {user.firstName}
                  </Descriptions.Item>
                  <Descriptions.Item label="Last Name">
                    {user.lastName}
                  </Descriptions.Item>
                  <Descriptions.Item label="Email">
                    {user.email}
                  </Descriptions.Item>
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
              )}
            </Col>
          </Row>

          <Row justify="end" gutter={16} style={{ marginTop: 24 }}>
            {isEditing && (
              <Button
                type="primary"
                onClick={handleSaveProfile}
                disabled={
                  formData.firstName === user.firstName &&
                  formData.lastName === user.lastName
                }
              >
                Save
              </Button>
            )}
            <Button
              icon={isEditing ? null : <EditOutlined />}
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? "Cancel" : "Edit"}
            </Button>
          </Row>
        </Form>
      ),
    },
    {
      key: "SecurityInformation",
      label: "Security",
      icon: <LockOutlined />,
      children: <UpdateSecurity />,
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
                  Account Settings
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
                        style={{ cursor: isEditing ? "pointer" : "default" }}
                        onClick={() =>
                          isEditing && fileInputRef.current.click()
                        }
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
