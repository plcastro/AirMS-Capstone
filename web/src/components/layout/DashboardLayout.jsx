import React, { useState, useEffect } from "react";
import { Layout, Button, theme, Avatar, message } from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
} from "@ant-design/icons";
import Sidebar from "./Sidebar";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

const { Header, Sider, Content } = Layout;

const DashboardLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState({});
  const location = useLocation();
  const navigate = useNavigate();

  const currentUserId = JSON.parse(localStorage.getItem("currentUser"))?.userid;

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // Fetch current user info
  useEffect(() => {
    if (!currentUserId) return;

    const fetchUserInfo = async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/api/users/${currentUserId}`,
        );
        if (!res.ok) throw new Error("Failed to fetch user info");
        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error(err);
        message.error("Failed to load user info");
      }
    };

    fetchUserInfo();

    const handleUserUpdate = (e) => setUser(e.detail);
    window.addEventListener("userUpdated", handleUserUpdate);
    return () => window.removeEventListener("userUpdated", handleUserUpdate);
  }, [currentUserId]);

  // Map pathnames to page titles
  const pageMap = {
    "/dashboard/user-management/list-of-users": "Users",
    "/dashboard/user-management/activity-logs": "Activity Logs",
    "/dashboard/flight-log": "Flight Logs",
    "/dashboard/maintenance-log": "Maintenance Logs",
    "/dashboard/profile": "Profile",
    "/dashboard/parts-monitoring/pm-table": "PM Table",
    "/dashboard/inventory-management": "Inventory Management",
    // add other routes here
  };
  const pageTitle = pageMap[location.pathname] || "Dashboard";

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    navigate("/login");
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* SIDEBAR */}
      <Sider
        width={250}
        collapsible
        collapsed={collapsed}
        trigger={null}
        theme="light"
      >
        <Sidebar collapsed={collapsed} />
      </Sider>

      <Layout>
        {/* HEADER */}
        <Header
          style={{
            padding: "0 6px",
            background: colorBgContainer,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 16, width: 48, height: 48 }}
            />
            <h3>{pageTitle}</h3>
          </div>

          <div style={{ display: "flex", alignItems: "center" }}>
            {user.image ? (
              <img
                src={user.image}
                alt="User"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <Avatar size="large" icon={<UserOutlined />} />
            )}
          </div>
        </Header>

        {/* PAGE CONTENT */}
        <Content
          style={{
            minHeight: "100vh",
            background: "#efeeee",
            borderRadius: borderRadiusLG,
            padding: 24,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default DashboardLayout;
