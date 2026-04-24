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

export default function UserForm({
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
  const [licenseNo, setLicenseNo] = useState("");
  const [joinedDate, setJoinedDate] = useState(new Date());
  const [imageUrl, setImageUrl] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const [touched, setTouched] = useState({});

  const handleBlur = (field) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  useEffect(() => {
    if (!visible) return;

    setTouched({});
    const roleMap = {
      Admin: "Admin",
      Pilot: "User",
      "Maintenance Manager": "Superuser",
      "Officer-In-Charge": "Superuser",
      Mechanic: "User",
      "Warehouse Department": "User",
    };

    if (user) {
      // Editing user
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setEmail(user.email || "");
      setUsername(user.username || "");
      setJobTitle(user.jobTitle || "");
      setAccessLevel(user.access || roleMap[user.jobTitle] || "");
      setLicenseNo(user.licenseNo || "");
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
      setLicenseNo("");
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

    let counter = 1;
    let finalUsername = base;
    const usernameExists = (name) => allUsers.some((u) => u.username === name);
    while (usernameExists(finalUsername)) {
      counter++;
      finalUsername = `${base}${counter}`;
    }
    setUsername(finalUsername);
  }, [firstName, lastName, user, allUsers]);

  // Auto-assign access level based on jobTitle
  useEffect(() => {
    const roleMap = {
      Admin: "Admin",
      Pilot: "User",
      "Officer-In-Charge": "Superuser",
      "Maintenance Manager": "Superuser",
      Mechanic: "User",
      "Warehouse Department": "User",
    };
    setAccessLevel(roleMap[jobTitle] || "");
  }, [jobTitle]);

  // Validation
  const errors = useMemo(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const nameRegex = /^[a-zA-Z'-\s]+$/;

    return {
      firstName: !firstName.trim()
        ? "First name is required"
        : !nameRegex.test(firstName)
          ? "First name can only contain letters, hyphens, or apostrophes"
          : null,
      lastName: !lastName.trim()
        ? "Last name is required"
        : !nameRegex.test(lastName)
          ? "Last name can only contain letters, hyphens, or apostrophes"
          : null,
      email: !email.trim()
        ? "Email is required"
        : !emailRegex.test(email)
          ? "Invalid email format"
          : null,
      jobTitle: !jobTitle ? "Job Title is required" : null,
    };
  }, [firstName, lastName, email, jobTitle]);

  const isFormInvalid = Object.values(errors).some((err) => err !== null);

  const handleSave = async () => {
    setLoading(true);

    try {
      let body;
      let headers = {};

      if (file) {
        body = new FormData();
        body.append("firstName", firstName.trim());
        body.append("lastName", lastName.trim());
        body.append("email", email.trim());
        body.append("username", username.trim());
        body.append("jobTitle", jobTitle);
        body.append("access", accessLevel);
        body.append("dateCreated", joinedDate.toISOString());
        body.append("image", file);
        if (
          [
            "maintenance manager",
            "pilot",
            "mechanic",
            "officer-in-charge",
          ].includes(jobTitle.toLowerCase())
        ) {
          body.append("licenseNo", licenseNo);
        }
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
          licenseNo,
        });
      }

      const url = user
        ? `${API_BASE}/api/user/update-user/${user._id}`
        : `${API_BASE}/api/user/create`;

      const res = await fetch(url, {
        method: user ? "PUT" : "POST",
        headers,
        body,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Operation failed");
      }
      const savedUser = await res.json();
      const savedUserData = savedUser?.data || savedUser?.user || null;
      antMessage.success(
        user ? "User updated successfully!" : "User added successfully!",
      );

      if (!user) {
        Modal.success({
          title: "Email Sent",
          content: `An invitation email has been sent to ${email}.`,
        });
      }

      const updatedUser = {
        _id: savedUserData?._id || user?._id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        username,
        jobTitle,
        access: accessLevel,
        dateCreated: joinedDate.toISOString(),
        image: savedUserData?.image || imageUrl,
        status: savedUserData?.status || "inactive",
        invitationStatus: savedUserData?.invitationStatus || "pending",
        invitationExpiresAt: savedUserData?.invitationExpiresAt || null,
        licenseNo: savedUserData?.licenseNo || licenseNo || "",
      };

      onUserSaved?.(updatedUser);
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
        <Col span={24} style={{ textAlign: "center" }}>
          <ImgCrop rotationSlider aspect={1 / 1}>
            <Upload
              listType="picture-card"
              showUploadList={false}
              beforeUpload={(file) => {
                setFile(file);
                setImageUrl(URL.createObjectURL(file));
                return false;
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
            maxLength={128}
            size="large"
            placeholder="Enter first name"
            status={touched.firstName && errors.firstName ? "error" : ""}
            value={firstName}
            onChange={(e) => {
              const value = e.target.value.replace(/[^a-zA-Z'-\s]/g, ""); // remove invalid chars
              setFirstName(value);
            }}
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
            maxLength={128}
            size="large"
            placeholder="Enter last name"
            status={touched.lastName && errors.lastName ? "error" : ""}
            value={lastName}
            onChange={(e) => {
              const value = e.target.value.replace(/[^a-zA-Z'-\s]/g, "");
              setLastName(value);
            }}
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
            placeholder="Enter email address"
            size="large"
            maxLength={256}
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

        <Col span={12}>
          <Text strong>Generated Username</Text>
          <Input size="large" value={username} disabled />
        </Col>

        <Col span={12}>
          <Text strong>Job Title</Text>
          <Select
            status={touched.jobTitle && errors.jobTitle ? "error" : ""}
            size="large"
            style={{ width: "100%" }}
            value={jobTitle || undefined}
            onChange={(val) => {
              setJobTitle(val);
              handleBlur("jobTitle");
            }}
            options={[
              { label: "Admin", value: "Admin" },
              { label: "Maintenance Manager", value: "Maintenance Manager" },
              { label: "Pilot", value: "Pilot" },
              { label: "Officer-In-Charge", value: "Officer-In-Charge" },
              { label: "Mechanic", value: "Mechanic" },
              { label: "Warehouse Department", value: "Warehouse Department" },
            ]}
          />
          {touched.jobTitle && errors.jobTitle && (
            <Text type="danger" style={{ fontSize: 11 }}>
              {errors.jobTitle}
            </Text>
          )}
        </Col>

        <Col span={12}>
          <Text strong>Access Level</Text>
          <Input value={accessLevel} disabled />
        </Col>

        {[
          "maintenance manager",
          "pilot",
          "mechanic",
          "officer-in-charge",
        ].includes(jobTitle.toLowerCase()) ? (
          <Col span={12}>
            <Text strong>License No.</Text>
            <Input
              placeholder="Enter license number"
              size="large"
              value={licenseNo}
              onChange={(e) => setLicenseNo(e.target.value.replace(/\D/g, ""))}
              maxLength={6}
              required={["maintenance manager", "pilot", "mechanic"].includes(
                jobTitle.toLowerCase(),
              )}
            />
          </Col>
        ) : null}

        <Col span={12}>
          <Text strong>Date Joined</Text>
          <Input
            size="large"
            value={joinedDate.toLocaleDateString()}
            disabled
          />
        </Col>
      </Row>
    </Modal>
  );
}
