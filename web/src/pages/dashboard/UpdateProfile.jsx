import React, { useState, useEffect, useContext, useRef } from "react";
import {
  Modal,
  Input,
  Button,
  Avatar,
  Tabs,
  Typography,
  Space,
  message,
} from "antd";
import { UserOutlined, UploadOutlined } from "@ant-design/icons";
import { AuthContext } from "../../context/AuthContext";
import { API_BASE } from "../../utils/API_BASE";

const { Text } = Typography;
const { TabPane } = Tabs;

export default function UpdateProfile({ visible, onClose }) {
  const { user, setUser } = useContext(AuthContext);
  const fileInputRef = useRef(null);

  const [page, setPage] = useState("1");
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
  });
  const [file, setFile] = useState(null);
  const [previewUri, setPreviewUri] = useState(
    user?.image
      ? user.image.startsWith("http")
        ? user.image
        : `${API_BASE}${user.image}`
      : `${API_BASE}/uploads/default_avatar.jpg`,
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasUppercase: false,
    hasNumber: false,
  });

  useEffect(() => {
    if (!visible || !user) return;

    setFormData({ firstName: user.firstName, lastName: user.lastName });
    setFile(null);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setFormErrors({});
    setPasswordRequirements({
      minLength: false,
      hasUppercase: false,
      hasNumber: false,
    });

    const img = user.image
      ? user.image.startsWith("http")
        ? user.image
        : `${API_BASE}${user.image}`
      : `${API_BASE}/uploads/default_avatar.jpg`;
    setPreviewUri(img);
  }, [visible, user]);

  // Validate form fields and password rules
  useEffect(() => {
    const errors = {};

    if (!formData.firstName.trim()) errors.firstName = "First name is required";
    else if (/[^a-zA-Z\s\-.'’]/.test(formData.firstName))
      errors.firstName = "Invalid characters in first name";

    if (!formData.lastName.trim()) errors.lastName = "Last name is required";
    else if (/[^a-zA-Z\s\-.'’]/.test(formData.lastName))
      errors.lastName = "Invalid characters in last name";

    if (currentPassword.includes(" "))
      errors.currentPassword = "Password should not include spaces";
    if (newPassword.includes(" "))
      errors.newPassword = "Password should not include spaces";
    if (confirmPassword.includes(" "))
      errors.confirmPassword = "Password should not include spaces";
    if (currentPassword && newPassword !== confirmPassword)
      errors.confirmPassword = "Passwords do not match";

    setFormErrors(errors);

    setPasswordRequirements({
      minLength: newPassword.length >= 8,
      hasUppercase: /[A-Z]/.test(newPassword),
      hasNumber: /\d/.test(newPassword),
    });
  }, [formData, currentPassword, newPassword, confirmPassword]);

  const handleChange = (key, value) =>
    setFormData({ ...formData, [key]: value });

  const pickImage = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreviewUri(URL.createObjectURL(f));
  };

  const resetForm = () => {
    setFormData({ firstName: user.firstName, lastName: user.lastName });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setFormErrors({});
    setPasswordRequirements({
      minLength: false,
      hasUppercase: false,
      hasNumber: false,
    });
    setFile(null);
    setPreviewUri(
      user?.image
        ? user.image.startsWith("http")
          ? user.image
          : `${API_BASE}${user.image}`
        : `${API_BASE}/uploads/default_avatar.jpg`,
    );
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isProfileChanged =
    formData.firstName.trim() !== user.firstName ||
    formData.lastName.trim() !== user.lastName ||
    file;

  const isPasswordValid =
    currentPassword &&
    newPassword &&
    confirmPassword &&
    newPassword === confirmPassword &&
    Object.keys(formErrors).length === 0;

  const isSaveEnabled = isProfileChanged || isPasswordValid;

  const confirmSave = async () => {
    try {
      let newImageUrl = user.image;

      // 1️⃣ Update Image if changed
      if (file) {
        const form = new FormData();
        form.append("image", file);

        const res = await fetch(
          `${API_BASE}/api/user/updateUserImage/${user.id}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: form,
          },
        );

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Image update failed");

        newImageUrl = data.user.image.startsWith("http")
          ? data.user.image
          : `${API_BASE}${data.user.image}`;
      }

      // 2️⃣ Update Name if changed
      const isNameChanged =
        formData.firstName.trim() !== user.firstName ||
        formData.lastName.trim() !== user.lastName;

      if (isNameChanged) {
        const profileRes = await fetch(
          `${API_BASE}/api/user/updateUserProfile/${user.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({
              firstName: formData.firstName,
              lastName: formData.lastName,
            }),
          },
        );

        const profileData = await profileRes.json();
        if (!profileRes.ok)
          throw new Error(profileData.message || "Profile update failed");
      }

      // 3️⃣ Update Password if changed
      const isPasswordChanged =
        currentPassword &&
        newPassword &&
        confirmPassword &&
        newPassword === confirmPassword;

      if (isPasswordChanged) {
        const passRes = await fetch(
          `${API_BASE}/api/user/change-password/${user.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({ currentPassword, newPassword }),
          },
        );

        const passData = await passRes.json();
        if (!passRes.ok)
          throw new Error(passData.message || "Password update failed");
      }

      // 4️⃣ Update local user state
      setUser((prev) => ({
        ...prev,
        firstName: isNameChanged ? formData.firstName : prev.firstName,
        lastName: isNameChanged ? formData.lastName : prev.lastName,
        image: newImageUrl,
      }));

      message.success("Profile updated successfully!");
      handleClose();
    } catch (err) {
      console.error(err);
      message.error(err.message || "Update failed");
    }
  };

  return (
    <Modal
      open={visible}
      onCancel={handleClose}
      footer={null}
      centered
      width={400}
      title="Update Profile"
    >
      <Tabs activeKey={page} onChange={(key) => setPage(key)}>
        <TabPane tab="Profile" key="1">
          <Space
            direction="vertical"
            style={{ width: "100%", alignItems: "center" }}
          >
            <Avatar
              size={120}
              src={previewUri}
              icon={<UserOutlined />}
              style={{ cursor: "pointer" }}
              onClick={() => fileInputRef.current.click()}
            />
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={pickImage}
            />
            <Text type="secondary">Click avatar to change</Text>
          </Space>
        </TabPane>
        <TabPane tab="Name" key="2">
          <Space orientation="vertical" style={{ width: "100%" }}>
            <Text>First Name</Text>
            <Input
              value={formData.firstName}
              onChange={(e) => handleChange("firstName", e.target.value)}
            />
            {formErrors.firstName && (
              <Text type="danger">{formErrors.firstName}</Text>
            )}

            <Text>Last Name</Text>
            <Input
              value={formData.lastName}
              onChange={(e) => handleChange("lastName", e.target.value)}
            />
            {formErrors.lastName && (
              <Text type="danger">{formErrors.lastName}</Text>
            )}
          </Space>
        </TabPane>
        <TabPane tab="Password" key="3">
          <Space orientation="vertical" style={{ width: "100%" }}>
            <Text>Current Password</Text>
            <Input.Password
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <Text>New Password</Text>
            <Input.Password
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Text>Confirm Password</Text>
            <Input.Password
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <Text
              type={passwordRequirements.minLength ? "success" : "secondary"}
            >
              ✓ At least 8 characters
            </Text>
            <Text
              type={passwordRequirements.hasUppercase ? "success" : "secondary"}
            >
              ✓ One uppercase
            </Text>
            <Text
              type={passwordRequirements.hasNumber ? "success" : "secondary"}
            >
              ✓ One number
            </Text>
          </Space>
        </TabPane>
      </Tabs>

      <Space style={{ width: "100%", marginTop: 20 }} orientation="vertical">
        <Button
          type="primary"
          onClick={confirmSave}
          disabled={!isSaveEnabled}
          block
        >
          Save Changes
        </Button>
        <Button onClick={handleClose} block>
          Cancel
        </Button>
      </Space>
    </Modal>
  );
}
