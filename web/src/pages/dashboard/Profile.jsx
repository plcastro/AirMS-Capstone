import React, { useContext, useState } from "react";
import { Card, Typography, Avatar, Button, Space } from "antd";
import { UserOutlined } from "@ant-design/icons";

import UpdateProfile from "./UpdateProfile";
import { AuthContext } from "../../context/AuthContext";
import { API_BASE } from "../../utils/API_BASE";

const { Title, Text } = Typography;

export default function Profile() {
  const { user, setUser } = useContext(AuthContext);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const getProfileImage = () => {
    if (!user.image) return null;
    // ensure we have the full URL
    return user.image.startsWith("http")
      ? user.image
      : `${API_BASE}${user.image}`;
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

        <Space
          orientation="vertical"
          align="baseline"
          style={{ width: "100%" }}
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
            <strong>Job Title:</strong> {user.jobTitle}
          </p>
        </Space>

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
