import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  Input,
  Button,
  Select,
  Divider,
  message as antMessage,
} from "antd";
import { API_BASE } from "../../utils/API_BASE";

export default function UserModal({ visible, onClose, onUserSaved, user }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [position, setPosition] = useState("");
  const [accessLevel, setAccessLevel] = useState("");
  const [joinedDate, setJoinedDate] = useState(new Date());
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!firstName || !lastName) return setUsername("");
    const generated = `${lastName}${firstName[0]}`
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "");
    setUsername(generated);
  }, [firstName, lastName]);

  useEffect(() => {
    switch (position) {
      case "Admin":
        setAccessLevel("Admin");
        break;
      case "Pilot":
      case "Manager":
      case "Head of Maintenance":
        setAccessLevel("Superuser");
        break;
      case "Mechanic":
        setAccessLevel("User");
        break;
      default:
        setAccessLevel("");
        break;
    }
  }, [position]);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setEmail(user.email || "");
      setUsername(user.username || "");
      setPosition(user.position || "");
      setJoinedDate(user.dateCreated ? new Date(user.dateCreated) : new Date());
    } else {
      setFirstName("");
      setLastName("");
      setEmail("");
      setUsername("");
      setPosition("");
      setJoinedDate(new Date());
      setFile(null);
    }
  }, [user, visible]);

  const handlePickImage = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) setFile(selectedFile);
  };

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      antMessage.error("Invalid email format.");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    const formData = new FormData();
    formData.append("firstName", firstName.trim());
    formData.append("lastName", lastName.trim());
    formData.append("email", email.trim());
    formData.append("username", username.trim());
    formData.append("position", position);
    formData.append("access", accessLevel);
    formData.append("dateCreated", joinedDate.toISOString());

    if (file) {
      formData.append("image", file);
    } else {
      formData.append("image", user?.image || ""); // Keep existing image if editing and no new file selected
    }

    setLoading(true);
    try {
      const url = user
        ? `${API_BASE}/api/user/updateUser/${user._id}`
        : `${API_BASE}/api/user/create`;
      const method = user ? "PUT" : "POST";
      const res = await fetch(url, { method, body: formData });
      const data = await res.json();
      if (!res.ok) {
        antMessage.error(data.message || "Operation failed.");
        return;
      }
      antMessage.success(
        user ? "User updated successfully" : "User added successfully",
      );
      onUserSaved?.();
      onClose();
    } catch (err) {
      console.error(err);
      antMessage.error("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={visible} // <-- use `open` instead of `visible`
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
        >
          {user ? "Update" : "Save"}
        </Button>,
      ]}
    >
      <div style={{ marginBottom: 10 }}>
        <Divider />
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handlePickImage}
        />
        <Button onClick={() => fileInputRef.current.click()}>
          {file ? "Change Image" : "Upload Image"}
        </Button>
      </div>
      <Input
        placeholder="First Name"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        style={{ marginBottom: 10 }}
        required
      />
      <Input
        placeholder="Last Name"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        style={{ marginBottom: 10 }}
        required
      />
      <Input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ marginBottom: 10 }}
        required
      />
      <Input
        placeholder="Username"
        value={username}
        disabled
        style={{ marginBottom: 10 }}
      />

      <Select
        placeholder="Select Position"
        value={position}
        onChange={setPosition}
        style={{ width: "100%", marginBottom: 10 }}
        options={[
          { label: "Admin", value: "Admin" },
          { label: "Head of Maintenance", value: "Head of Maintenance" },
          { label: "Pilot", value: "Pilot" },
          { label: "Manager", value: "Manager" },
          { label: "Mechanic", value: "Mechanic" },
        ]}
        required
      />
      <Input
        placeholder="Access Level"
        value={accessLevel}
        disabled
        style={{ marginBottom: 10 }}
      />
      <Input
        placeholder="Joined Date"
        value={joinedDate.toLocaleDateString()}
        disabled
      />
    </Modal>
  );
}
