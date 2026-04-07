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
  const { user, setUser } = useContext(AuthContext);
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
              Authorization: `Bearer ${localStorage.getItem("token")}`,
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
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: formData,
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to upload");

      setUser(data.user);
      setPreviewUri(`${API_BASE}${data.user.image}`);
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
            Authorization: `Bearer ${localStorage.getItem("token")}`,
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
            {/* First & Last Name */}
            <Col xs={24} md={12}>
              {isEditing ? (
                <Form.Item label="First Name">
                  <Input
                    value={formData.firstName}
                    size="large"
                    style={{ marginTop: 8, color: "black" }}
                    onChange={(e) => handleChange("firstName", e.target.value)}
                  />
                </Form.Item>
              ) : (
                <div
                  style={{ padding: 8, borderRadius: 6, background: "#fafafa" }}
                >
                  <Text type="secondary">First Name: </Text>
                  <Text strong>{user.firstName}</Text>
                </div>
              )}
            </Col>

            <Col xs={24} md={12}>
              {isEditing ? (
                <Form.Item label="Last Name">
                  <Input
                    value={formData.lastName}
                    size="large"
                    style={{ marginTop: 8, color: "black" }}
                    onChange={(e) => handleChange("lastName", e.target.value)}
                  />
                </Form.Item>
              ) : (
                <div
                  style={{ padding: 8, borderRadius: 6, background: "#fafafa" }}
                >
                  <Text type="secondary">Last Name: </Text>
                  <Text strong>{user.lastName}</Text>
                </div>
              )}
            </Col>

            {/* Email & Username */}
            <Col xs={24} md={12}>
              <div
                style={{ padding: 8, borderRadius: 6, background: "#fafafa" }}
              >
                <Text type="secondary">Email: </Text>
                <Text strong>{user.email}</Text>
              </div>
            </Col>
            <Col xs={24} md={12}>
              <div
                style={{ padding: 8, borderRadius: 6, background: "#fafafa" }}
              >
                <Text type="secondary">Username: </Text>
                <Text strong>{user.username}</Text>
              </div>
            </Col>

            {/* Job Title & Last Login */}
            <Col xs={24} md={12}>
              <div
                style={{ padding: 8, borderRadius: 6, background: "#fafafa" }}
              >
                <Text type="secondary">Job Title: </Text>
                <Text strong>
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
                </Text>
              </div>
            </Col>
            <Col xs={24} md={12}>
              <div
                style={{ padding: 8, borderRadius: 6, background: "#fafafa" }}
              >
                <Text type="secondary">Last Login: </Text>
                <Text strong>{formatDate(user.lastLogin)}</Text>
              </div>
            </Col>
          </Row>

          <Row justify="end" gutter={16}>
            {isEditing && (
              <Button
                type="primary"
                onClick={handleSaveProfile}
                style={{ marginRight: 10 }}
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
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        padding: 20,
        height: "100vh",
        overflowY: "auto",
        paddingBottom: 100,
      }}
    >
      <Card
        style={{
          width: "100%",
          borderRadius: 12,
          height: "max-content",
        }}
      >
        <Row align="center">
          <Col
            xs={24}
            s={24}
            md={10}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
            }}
          >
            <Title level={4} style={{ alignSelf: "center" }}>
              Profile Picture
            </Title>
            <img
              src={previewUri || DefaultAvatar}
              alt="Profile"
              style={{
                width: 168,
                height: 168,
                borderRadius: "50%",
                objectFit: "cover",
                cursor: isEditing ? "pointer" : "default",
              }}
              onClick={() => isEditing && fileInputRef.current.click()}
            />
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={pickImage}
            />
            <Row align="middle" justify="space-evenly">
              <Col
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: 10,
                }}
              >
                <Button
                  type="primary"
                  onClick={() =>
                    file ? handleSaveImage() : fileInputRef.current.click()
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
              </Col>
            </Row>
          </Col>

          <Col xs={24} s={24} md={24} lg={12}>
            <Tabs
              centered
              defaultActiveKey={tabItems[0]?.key || "UserInformation"}
              items={tabItems}
              size="medium"
            />
          </Col>
        </Row>
      </Card>
    </div>
  );
}
