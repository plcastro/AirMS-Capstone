import React, { useContext, useState } from "react";
import { Card, Typography, Avatar, Button } from "antd";
import { UserOutlined } from "@ant-design/icons";

import UpdateProfile from "./UpdateProfile";
import { AuthContext } from "../../context/AuthContext";
import { API_BASE } from "../../utils/API_BASE";

const { Title } = Typography;

export default function Profile() {
  const { user, setUser } = useContext(AuthContext);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  console.log(user.lastLogin);
  const getProfileImage = () => {
    if (!user.image) return null;
    // ensure we have the full URL
    return user.image.startsWith("http")
      ? user.image
      : `${API_BASE}${user.image}`;
  };
  const capitalizeJobTitle = (jobTitle) => {
    if (!jobTitle) return "";

    return jobTitle
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        padding: 40,
      }}
    >
      <Card
        style={{
          width: 400,
          textAlign: "center",
          borderRadius: 12,
        }}
      >
        <Title level={3}>User Profile</Title>

        {user.image ? (
          <img
            src={getProfileImage()}
            alt="Profile"
            style={{
              width: 150,
              height: 150,
              borderRadius: "50%",
              marginBottom: 20,
            }}
          />
        ) : (
          <Avatar
            size={150}
            icon={<UserOutlined />}
            style={{ marginBottom: 20 }}
          />
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          <p>
            <strong>Name:</strong> {user.firstName} {user.lastName}
          </p>
          <p>
            <strong>Email:</strong> {user.email}
          </p>
          <p>
            <strong>Username:</strong> {user.username}
          </p>
          <p>
            <strong>Job Title:</strong> {capitalizeJobTitle(user.jobTitle)}
          </p>
          <p>
            <strong>Last Login:</strong> {formatDate(user.lastLogin)}
          </p>
        </div>

        <Button
          type="primary"
          style={{ marginTop: 20 }}
          onClick={() => setShowUpdateModal(true)}
        >
          Edit Profile
        </Button>
      </Card>

      <UpdateProfile
        user={user}
        visible={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        onSubmit={(updatedData) => {
          // Immediately update context with the new info
          setUser((prev) => ({
            ...prev,
            firstName: updatedData.firstName,
            lastName: updatedData.lastName,
            image: updatedData.image.startsWith("http")
              ? updatedData.image
              : `${API_BASE}${updatedData.image}`,
          }));
          setShowUpdateModal(false);
        }}
      />
    </div>
  );
}
