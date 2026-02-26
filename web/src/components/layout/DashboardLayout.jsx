import React, { useState, useEffect } from "react";

import { Outlet, useLocation } from "react-router-dom";
import { Layout, Button, Drawer, Grid, message, Avatar } from "antd";
import { MenuOutlined, UserOutlined } from "@ant-design/icons";
import Sidebar from "./Sidebar";

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

const headerStyle = {
  height: "64px",
  fontSize: "clamp(24px, 4vw, 28px)",
  backgroundColor: "white",
  boxShadow: "0 2px 8px #0000007c",
  fontWeight: "500",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "left",
  padding: "0 24px",
};

const contentStyle = {
  padding: "20px 2%",
};

const siderStyle = {
  backgroundColor: "#ffffff",
  color: "#000000",
  minHeight: "100vh",
  position: "fixed",
  left: 0,
  top: 0,
  bottom: 0,
  zIndex: 5,
};

const DashboardLayout = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const screens = useBreakpoint();
  const isTablet = !screens.xl;
  const isMobile = screens.sm;
  const [user, setUser] = useState({});

  const currentUserId = JSON.parse(localStorage.getItem("currentUser"))?.userid;

  // Fetch user info based on user ID
  const fetchUserInfo = async (userid) => {
    if (!userid) return;
    try {
      const res = await fetch(`http://localhost:8000/api/users/${userid}`);
      if (!res.ok) throw new Error("Failed to fetch user info");
      const data = await res.json();
      setUser(data);
    } catch (err) {
      console.error(err);
      message.error("Failed to load user info");
    }
  };

  useEffect(() => {
    fetchUserInfo(currentUserId);

    // Listen for user updates
    const handleUserUpdate = (e) => {
      setUser(e.detail);
    };

    window.addEventListener("userUpdated", handleUserUpdate);

    return () => {
      window.removeEventListener("userUpdated", handleUserUpdate);
    };
  }, [currentUserId]);

  // Map URL paths to page titles
  const pageMap = {
    "/dashboard/user-management/list-of-users": "Users",
    "/dashboard/user-management/activity-logs": "Activity Logs",
    // "/dashboard/view/records": "View Records",
    // "/dashboard/view/staff": "Staff List",
    // "/dashboard/view/profile": "Profile",
    // "/dashboard/edit/profile": "Edit Profile",
  };
  const page = pageMap[location.pathname] || "Dashboard";

  return (
    <Layout style={{ minHeight: "100vh", overflow: "hidden" }}>
      {isTablet ? (
        <>
          <Button
            type="text"
            icon={
              <MenuOutlined style={{ fontSize: "clamp(12px, 1.8vw, 16px)" }} />
            }
            onClick={() => setOpen(true)}
            style={{
              position: "fixed",
              top: "-10px",
              left: "10px",
              zIndex: 1000,
              background: "white",
              borderRadius: "8px",
            }}
          />
          <Drawer
            placement="left"
            onClose={() => setOpen(false)}
            open={open}
            size="300px"
            style={{
              backgroundColor: "#ffffff",
              color: "white",
              padding: 0,
            }}
          >
            <Sidebar />
          </Drawer>
        </>
      ) : (
        <Sider width="15%" style={siderStyle}>
          <Sidebar />
        </Sider>
      )}

      <Layout
        style={{
          marginLeft: isTablet ? 0 : "15%",
          width: isTablet ? "100%" : "85%",
          overflowX: "hidden",
        }}
      >
        <Header style={headerStyle}>
          <div
            style={{
              fontSize: isTablet ? "18px" : "24px",
              fontWeight: 500,
            }}
          >
            {page}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            {user.image ? (
              <img
                src={user?.image}
                alt="User"
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "1px solid #ffffff",
                }}
              />
            ) : (
              <Avatar size="large">{!user.image && <UserOutlined />}</Avatar>
            )}
            {isMobile && (
              <div style={{ textAlign: "left", lineHeight: "1.2" }}>
                <p style={{ margin: 0, fontSize: "14px", color: "#000000" }}>
                  {user?.name || "full name"}
                </p>
                <p style={{ margin: 0, fontSize: "12px", color: "#555" }}>
                  {user?.position || "position"}
                </p>
              </div>
            )}
          </div>
        </Header>
        <Content style={contentStyle}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default DashboardLayout;
