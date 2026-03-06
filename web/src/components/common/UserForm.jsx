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
import { PlusOutlined } from "@ant-design/icons";
import ImgCrop from "antd-img-crop";

const { Text } = Typography;

export default function UserModal({
  visible,
  onClose,
  onUserSaved,
  user,
  allUsers,
}) {
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

  // Track which fields have been touched for validation messages
  const [touched, setTouched] = useState({});

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  useEffect(() => {
    if (user) return;

    if (!firstName || !lastName) {
      setUsername("");
      return;
    }

    const baseUsername = `${lastName}${firstName[0]}`
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "");

    let finalUsername = baseUsername;
    let counter = 1;

    const usernameExists = (name) => allUsers.some((u) => u.username === name);

    while (usernameExists(finalUsername)) {
      counter++;
      finalUsername = `${baseUsername}${counter}`;
    }

    setUsername(finalUsername);
  }, [firstName, lastName, user, allUsers]);

  useEffect(() => {
    const roleMap = {
      Admin: "Admin",
      Pilot: "Superuser",
      Manager: "Superuser",
      "Head of Maintenance": "Superuser",
      Mechanic: "User",
    };
    setAccessLevel(roleMap[jobTitle] || "");
  }, [jobTitle]);

  // 3. Reset/Populate form
  useEffect(() => {
    if (visible) {
      setTouched({});
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

  // 4. Validation Logic
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
      jobTitle: !jobTitle ? "Job Title is required" : null,
    }),
    [firstName, lastName, email, jobTitle],
  );

  const isFormInvalid = Object.values(errors).some((err) => err !== null);

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
      antMessage.error("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={visible}
      title={user ? "Edit User" : "Add User"}
      onCancel={onClose}
      width={600}
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
      <Row gutter={[16, 16]}>
        <Col span={24} style={{ textAlign: "center" }}>
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

        <Col span={12}>
          <Text strong>First Name</Text>
          <Input
            status={touched.firstName && errors.firstName ? "error" : ""}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            onBlur={() => handleBlur("firstName")}
          />
          {touched.firstName && errors.firstName && (
            <Text type="danger" style={{ fontSize: "11px" }}>
              {errors.firstName}
            </Text>
          )}
        </Col>

        <Col span={12}>
          <Text strong>Last Name</Text>
          <Input
            status={touched.lastName && errors.lastName ? "error" : ""}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            onBlur={() => handleBlur("lastName")}
          />
          {touched.lastName && errors.lastName && (
            <Text type="danger" style={{ fontSize: "11px" }}>
              {errors.lastName}
            </Text>
          )}
        </Col>

        <Col span={24}>
          <Text strong>Email Address</Text>
          <Input
            status={touched.email && errors.email ? "error" : ""}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => handleBlur("email")}
          />
          {touched.email && errors.email && (
            <Text type="danger" style={{ fontSize: "11px" }}>
              {errors.email}
            </Text>
          )}
        </Col>

        <Col span={12}>
          <Text strong>Generated Username</Text>
          <Input value={username} disabled />
        </Col>

        <Col span={12}>
          <Text strong>JobTitle</Text>
          <Select
            status={touched.jobTitle && errors.jobTitle ? "error" : ""}
            style={{ width: "100%" }}
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
          {touched.jobTitle && errors.jobTitle && (
            <Text type="danger" style={{ fontSize: "11px" }}>
              {errors.jobTitle}
            </Text>
          )}
        </Col>

        <Col span={12}>
          <Text strong>Access Level</Text>
          <Input value={accessLevel} disabled />
        </Col>

        <Col span={12}>
          <Text strong>Date Joined</Text>
          <Input value={joinedDate.toLocaleDateString()} disabled />
        </Col>
      </Row>
    </Modal>
  );
}
