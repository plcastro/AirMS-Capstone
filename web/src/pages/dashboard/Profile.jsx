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
} from "antd";
import { EditOutlined, LockOutlined, UserOutlined } from "@ant-design/icons";
import { AuthContext } from "../../context/AuthContext";
import { API_BASE } from "../../utils/API_BASE";
import UpdateSecurity from "./UpdateSecurity";

const { Title, Text } = Typography;

export default function Profile() {
  const { user, setUser } = useContext(AuthContext);
  const [form] = Form.useForm();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ firstName: "", lastName: "" });
  const [formErrors, setFormErrors] = useState({});
  const [file, setFile] = useState(null);
  const [previewUri, setPreviewUri] = useState("");
  const fileInputRef = useRef(null);

  // --- Profile image ---
  const getProfileImage = () => {
    if (!user?.image) return `${API_BASE}/uploads/default_avatar.jpg`;
    return user.image.startsWith("http")
      ? user.image
      : `${API_BASE}${user.image}`;
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

  // --- Load user info ---
  useEffect(() => {
    if (!user) return;

    setFormData({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
    });

    setPreviewUri(getProfileImage());
    setFile(null);
  }, [user]);

  // --- Profile editing ---
  const handleChange = (key, value) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const pickImage = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUri(URL.createObjectURL(f));
  };

  const isProfileChanged =
    formData.firstName !== user?.firstName ||
    formData.lastName !== user?.lastName;

  const isPictureChanged = file;

  const handleSaveProfile = async () => {
    try {
      if (
        formData.firstName !== user.firstName ||
        formData.lastName !== user.lastName
      ) {
        const res = await fetch(
          `${API_BASE}/api/user/updateUserProfile/${user.id}`,
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

    try {
      const formDataObj = new FormData();
      formDataObj.append("image", file);

      const res = await fetch(
        `${API_BASE}/api/user/updateUserImage/${user.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: formDataObj,
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      const newImageUrl = data.user.image.startsWith("http")
        ? data.user.image
        : `${API_BASE}${data.user.image}`;

      setUser((prev) => ({ ...prev, image: newImageUrl }));
      setFile(null);
      message.success("Profile picture updated!");
    } catch (err) {
      message.error(err.message || "Image update failed");
    }
  };

  const handleRemoveImage = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/user/updateUserImage/${user.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ image: null }),
        },
      );

      if (!res.ok) throw new Error("Failed to remove image from server");

      setUser((prev) => ({ ...prev, image: null }));

      setFile(null);
      message.success("Profile picture removed and space cleared!");
    } catch (err) {
      message.error(err.message || "Failed to remove picture");
    }
  };

  const tabItems = [];

  tabItems.push(
    {
      key: "UserInformation",
      label: "User Information",
      icon: <UserOutlined />,
      children: (
        <Form layout="vertical" form={form}>
          <Row gutter={16}>
            <Col xs={24} s={24} md={12}>
              <Form.Item label="First Name">
                <Input
                  value={isEditing ? formData.firstName : user.firstName}
                  disabled={!isEditing}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                />
                {formErrors.firstName && (
                  <Text type="danger">{formErrors.firstName}</Text>
                )}
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Last Name">
                <Input
                  value={isEditing ? formData.lastName : user.lastName}
                  disabled={!isEditing}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                />
                {formErrors.lastName && (
                  <Text type="danger">{formErrors.lastName}</Text>
                )}
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="Email">
                <Input value={user.email} disabled />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Username">
                <Input value={user.username} disabled />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="Job Title">
                <Input value={user.jobTitle} disabled />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Last Login">
                <Input value={formatDate(user.lastLogin)} disabled />
              </Form.Item>
            </Col>
          </Row>

          <Row justify="end" gutter={16}>
            {isEditing && (
              <Button
                type="primary"
                onClick={handleSaveProfile}
                style={{ marginRight: 10 }}
                disabled={!isProfileChanged}
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
      children: (
        <>
          <UpdateSecurity />
        </>
      ),
    },
  );

  if (!user) return null;

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 20 }}>
      <Card
        style={{
          width: 800,
          minWidth: "95%",
          borderRadius: 12,
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        {/* PROFILE PICTURE */}
        <Title level={4}>Profile Picture</Title>
        <Row gutter={21} align={"top"} justify={"center"}>
          <Col
            xs={24}
            s={24}
            md={10}
            lg={8}
            style={{ display: "flex", flexDirection: "column" }}
          >
            <img
              src={previewUri}
              alt="Profile"
              style={{
                margin: "auto",
                width: 250,
                height: "auto",
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
            <Row
              gutter={16}
              align={"middle"}
              justify={"space-evenly"}
              style={{ marginBottom: 20 }}
            >
              <Col
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
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

                <Button danger onClick={handleRemoveImage}>
                  Remove Picture
                </Button>
              </Col>
            </Row>
          </Col>
          <Col></Col>
          <Col xs={24} s={24} md={24} lg={12}>
            {/* USER INFO */}
            <Tabs
              defaultActiveKey={tabItems[0]?.key || "UserInformation"}
              items={tabItems}
            />
          </Col>
        </Row>
      </Card>
    </div>
  );
}
