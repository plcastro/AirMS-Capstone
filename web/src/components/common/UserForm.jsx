import React, { useState, useEffect, useMemo } from "react";
import { API_BASE } from "../../utils/API_BASE";
import {
  Modal,
  Upload,
  Input,
  Button,
  Select,
  Divider,
  message as antMessage,
  Col,
  Row,
  Typography,
} from "antd";
import { LoadingOutlined, PlusOutlined } from "@ant-design/icons";
import ImgCrop from "antd-img-crop";

const { Text } = Typography;

export default function UserModal({ visible, onClose, onUserSaved, user }) {
  // --- Form States ---
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [accessLevel, setAccessLevel] = useState("");
  const [joinedDate, setJoinedDate] = useState(new Date());
  const [imageUrl, setImageUrl] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // --- Tracking "Touched" Fields ---
  const [touched, setTouched] = useState({});

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // --- Reset logic ---
  useEffect(() => {
    if (visible) {
      setTouched({}); // Reset errors when modal opens
      if (user) {
        setFirstName(user.firstName || "");
        setLastName(user.lastName || "");
        setEmail(user.email || "");
        setUsername(user.username || "");
        setJobTitle(user.jobTitle || "");
        setAccessLevel(user.access || "");
        setJoinedDate(
          user.dateCreated ? new Date(user.dateCreated) : new Date(),
        );
        setImageUrl(user.image || null);
      } else {
        setFirstName("");
        setLastName("");
        setEmail("");
        setUsername("");
        setJobTitle("");
        setAccessLevel("");
        setJoinedDate(new Date());
        setImageUrl(null);
        setFile(null);
      }
    }
  }, [user, visible]);

  // --- Validation Logic ---
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const errors = useMemo(
    () => ({
      firstName: !firstName.trim() ? "First name is required" : null,
      lastName: !lastName.trim() ? "Last name is required" : null,
      email: !email.trim()
        ? "Email is required"
        : !emailRegex.test(email)
          ? "Invalid email format"
          : null,
      jobTitle: !jobTitle ? "JobTitle is required" : null,
    }),
    [firstName, lastName, email, jobTitle],
  );

  const isFormInvalid = Object.values(errors).some((err) => err !== null);

  // --- Save Handler ---
  const handleSave = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.append("firstName", firstName.trim());
    formData.append("lastName", lastName.trim());
    formData.append("email", email.trim());
    formData.append("username", username.trim());
    formData.append("jobTitle", jobTitle);
    formData.append("access", accessLevel);
    formData.append("dateCreated", joinedDate.toISOString());
    if (file) formData.append("image", file);

    try {
      const url = user
        ? `${API_BASE}/api/user/updateUser/${user._id}`
        : `${API_BASE}/api/user/create`;
      const res = await fetch(url, {
        method: user ? "PUT" : "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Operation failed");
      antMessage.success(user ? "User updated" : "User added");
      onUserSaved?.();
      onClose();
    } catch (err) {
      antMessage.error(err.message || "Server error");
    } finally {
      setLoading(false);
    }
  };

  // Helper to render error text
  const ErrorMsg = ({ field }) =>
    touched[field] && errors[field] ? (
      <div style={{ marginBottom: 8 }}>
        <Text type="danger" style={{ fontSize: "12px" }}>
          {errors[field]}
        </Text>
      </div>
    ) : (
      <div style={{ marginBottom: 16 }} />
    );

  return (
    <Modal
      open={visible}
      title={user ? "Edit User" : "Add User"}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="save"
          type="primary"
          loading={loading}
          onClick={handleSave}
          disabled={isFormInvalid}
        >
          {user ? "Update" : "Save"}
        </Button>,
      ]}
    >
      <Divider />
      <Row gutter={[0, 0]} justify="center">
        <Col span={24} style={{ textAlign: "center", marginBottom: 20 }}>
          <ImgCrop rotationSlider aspect={1 / 1}>
            <Upload
              listType="picture-card"
              showUploadList={false}
              action="https://660d2bd96ddfa2943b33731c.mockapi.io/api/upload"
              onChange={(info) => {
                if (info.file.originFileObj) {
                  setFile(info.file.originFileObj);
                  setImageUrl(URL.createObjectURL(info.file.originFileObj));
                }
              }}
            >
              {imageUrl ? (
                <img src={imageUrl} alt="avatar" style={{ width: "100%" }} />
              ) : (
                <PlusOutlined />
              )}
            </Upload>
          </ImgCrop>
        </Col>

        <Col span={24}>
          <Text strong>First Name</Text>
          <Input
            status={touched.firstName && errors.firstName ? "error" : ""}
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            onBlur={() => handleBlur("firstName")}
          />
          <ErrorMsg field="firstName" />

          <Text strong>Last Name</Text>
          <Input
            status={touched.lastName && errors.lastName ? "error" : ""}
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            onBlur={() => handleBlur("lastName")}
          />
          <ErrorMsg field="lastName" />

          <Text strong>Email</Text>
          <Input
            status={touched.email && errors.email ? "error" : ""}
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => handleBlur("email")}
          />
          <ErrorMsg field="email" />

          <Text strong>JobTitle</Text>
          <Select
            status={touched.jobTitle && errors.jobTitle ? "error" : ""}
            style={{ width: "100%" }}
            placeholder="Select JobTitle"
            value={jobTitle || undefined}
            onChange={(val) => {
              setJobTitle(val);
              handleBlur("jobTitle");
            }}
            options={[
              { label: "Admin", value: "Admin" },
              { label: "Pilot", value: "Pilot" },
              { label: "Manager", value: "Manager" },
              { label: "Mechanic", value: "Mechanic" },
            ]}
          />
          <ErrorMsg field="jobTitle" />
        </Col>
      </Row>
    </Modal>
  );
}
