import React, { useState, useEffect, useMemo } from "react";
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
import { API_BASE } from "../../utils/API_BASE";

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

  const [touched, setTouched] = useState({});

  const handleBlur = (field) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  // Reset / populate form & generate username / access level
  useEffect(() => {
    if (!visible) return;

    setTouched({});
    const roleMap = {
      Admin: "Admin",
      Pilot: "Superuser",
      Manager: "Superuser",
      "Head of Maintenance": "Superuser",
      Mechanic: "User",
    };

    if (user) {
      // Editing user
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setEmail(user.email || "");
      setUsername(user.username || "");
      setJobTitle(user.jobTitle || "");
      setAccessLevel(roleMap[user.jobTitle] || "");
      setJoinedDate(user.dateCreated ? new Date(user.dateCreated) : new Date());
      setImageUrl(user.image || null);
      setFile(null);
    } else {
      // New user
      setFirstName("");
      setLastName("");
      setEmail("");
      setJobTitle("");
      setAccessLevel("");
      setJoinedDate(new Date());
      setImageUrl(null);
      setFile(null);
      setUsername("");
    }
  }, [visible, user]);

  // Generate username for new users
  useEffect(() => {
    if (user) return; // skip for editing
    if (!firstName || !lastName || !allUsers) return;

    let base = `${lastName}${firstName[0]}`
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "");
    let finalUsername = base;
    let counter = 1;
    while (allUsers.some((u) => u.username === finalUsername)) {
      counter++;
      finalUsername = `${base}${counter}`;
    }
    setUsername(finalUsername);
  }, [firstName, lastName, user, allUsers]);

  // Auto-assign access level based on jobTitle
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

  // Validation
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

  // Save user
  const handleSave = async () => {
    setLoading(true);

    try {
      // --- Prepare payload ---
      let body;
      let headers = {};

      if (file) {
        // If image/file is uploaded, use FormData
        body = new FormData();
        body.append("firstName", firstName.trim());
        body.append("lastName", lastName.trim());
        body.append("email", email.trim());
        body.append("username", username.trim());
        body.append("jobTitle", jobTitle);
        body.append("access", accessLevel);
        body.append("dateCreated", joinedDate.toISOString());
        body.append("image", file); // only append if file exists
      } else {
        // No file, send JSON
        headers["Content-Type"] = "application/json";
        body = JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          username: username.trim(),
          jobTitle,
          access: accessLevel,
          dateCreated: joinedDate.toISOString(),
        });
      }

      // --- Debug log: see what’s being sent ---
      console.log(
        "Sending payload:",
        file ? [...body.entries()] : JSON.parse(body),
      );

      const url = user
        ? `${API_BASE}/api/user/updateUser/${user._id}`
        : `${API_BASE}/api/user/create`;

      const res = await fetch(url, {
        method: user ? "PUT" : "POST",
        headers,
        body,
      });

      if (!res.ok) {
        // Try to read backend error message
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Operation failed");
      }

      antMessage.success(
        user ? "User updated successfully!" : "User added successfully!",
      );

      if (!user) {
        Modal.success({
          title: "Email Sent",
          content: `An invitation email has been sent to ${email}.`,
        });
      }

      onUserSaved?.();
      onClose();
    } catch (err) {
      console.error("Error saving user:", err);
      antMessage.error(err.message || "Server error. Please try again.");
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
        {/* Avatar */}
        <Col span={24} style={{ textAlign: "center" }}>
          <ImgCrop rotationSlider aspect={1 / 1}>
            <Upload
              listType="picture-card"
              showUploadList={false}
              beforeUpload={(file) => {
                setFile(file);
                setImageUrl(URL.createObjectURL(file));
                return false; // prevent auto upload
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

        {/* First / Last Name */}
        <Col span={12}>
          <Text strong>First Name</Text>
          <Input
            status={touched.firstName && errors.firstName ? "error" : ""}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            onBlur={() => handleBlur("firstName")}
          />
          {touched.firstName && errors.firstName && (
            <Text type="danger" style={{ fontSize: 11 }}>
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
            <Text type="danger" style={{ fontSize: 11 }}>
              {errors.lastName}
            </Text>
          )}
        </Col>

        {/* Email */}
        <Col span={24}>
          <Text strong>Email Address</Text>
          <Input
            status={touched.email && errors.email ? "error" : ""}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => handleBlur("email")}
          />
          {touched.email && errors.email && (
            <Text type="danger" style={{ fontSize: 11 }}>
              {errors.email}
            </Text>
          )}
        </Col>

        {/* Username / Job Title */}
        <Col span={12}>
          <Text strong>Generated Username</Text>
          <Input value={username} disabled />
        </Col>

        <Col span={12}>
          <Text strong>Job Title</Text>
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
            <Text type="danger" style={{ fontSize: 11 }}>
              {errors.jobTitle}
            </Text>
          )}
        </Col>

        {/* Access Level / Date Joined */}
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
