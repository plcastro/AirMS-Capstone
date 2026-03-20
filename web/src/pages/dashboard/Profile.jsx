import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Card,
  Typography,
  Avatar,
  Button,
  Input,
  Form,
  Divider,
  Row,
  Col,
  Tabs,
  Space,
  message,
} from "antd";
import { EditOutlined } from "@ant-design/icons";
import { AuthContext } from "../../context/AuthContext";
import { API_BASE } from "../../utils/API_BASE";
import UpdateSecurity from "./UpdateSecurity";
const { Title, Text } = Typography;

export default function Profile() {
  const { user, setUser } = useContext(AuthContext);
  const [form] = Form.useForm();

  const [isEditing, setIsEditing] = useState(false);

  const [showUpdateSecurity, setShowUpdateSecurity] = useState(false);
  const [formData, setFormData] = useState({ firstName: "", lastName: "" });
  const [formErrors, setFormErrors] = useState({});
  const [file, setFile] = useState(null);
  const [previewUri, setPreviewUri] = useState("");
  const fileInputRef = useRef(null);

  const sigCanvasRef = useRef(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pin, setPin] = useState(user?.pin || "");
  const [signatureData, setSignatureData] = useState(user?.signature || "");

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
    setPin(user?.pin || "");
    setSignatureData(user?.signature || "");

    if (sigCanvasRef.current && user?.signature) {
      sigCanvasRef.current.fromDataURL(user.signature);
    }
  }, [user]);

  // --- Validation ---
  useEffect(() => {
    const errors = {};
    if (currentPassword.includes(" "))
      errors.currentPassword = "Password cannot have spaces";
    if (newPassword.includes(" "))
      errors.newPassword = "Password cannot have spaces";
    if (confirmPassword.includes(" "))
      errors.confirmPassword = "Password cannot have spaces";
    if (newPassword && confirmPassword && newPassword !== confirmPassword)
      errors.confirmPassword = "Passwords do not match";
    if (pin && pin.length !== 6) errors.pin = "PIN must be 6 digits";

    setFormErrors(errors);
  }, [currentPassword, newPassword, confirmPassword, pin]);

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
    formData.lastName !== user?.lastName ||
    file;

  const handleSaveProfile = async () => {
    try {
      let newImageUrl = user.image;
      if (file) {
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
        newImageUrl = data.user.image.startsWith("http")
          ? data.user.image
          : `${API_BASE}${data.user.image}`;
      }

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
        image: newImageUrl,
      }));

      setIsEditing(false);
      setFile(null);
      message.success("Profile updated successfully!");
    } catch (err) {
      console.error(err);
      message.error(err.message || "Profile update failed");
    }
  };

  if (!user) return null;

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <Card
        style={{
          width: 800,
          minWidth: "95%",
          borderRadius: 12,
          maxHeight: "85vh",
          overflowY: "auto",
          padding: "2%",
        }}
      >
        {/* PROFILE PICTURE */}
        <Title level={4}>Profile Picture</Title>
        <Row align="middle" gutter={16}>
          <Col>
            <img
              src={previewUri}
              alt="Profile"
              style={{
                width: 150,
                height: 150,
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
          </Col>
          <Col>
            <Row>
              <Button
                type="primary"
                onClick={() => fileInputRef.current.click()}
                style={{ marginBottom: 5 }}
              >
                Change Picture
              </Button>
            </Row>
            <Row>
              <Button
                danger
                onClick={() => {
                  setFile(null);
                  setPreviewUri(`${API_BASE}/uploads/default_avatar.jpg`);
                }}
              >
                Remove Picture
              </Button>
            </Row>
          </Col>
        </Row>

        <Divider />

        {/* USER INFO */}
        <Form layout="vertical" form={form}>
          <Title level={4}>User Information</Title>
          <Row gutter={16}>
            <Col xs={24} md={12}>
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

          {/* <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="Signature">
                <Input value={"######"} disabled />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="PIN">
                <Input value={"######"} disabled />
              </Form.Item>
            </Col>
          </Row> */}

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

        <Divider />

        <UpdateSecurity />
      </Card>
    </div>
  );
}
