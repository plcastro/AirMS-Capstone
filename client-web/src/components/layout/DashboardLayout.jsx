import React, { useState, useContext, useMemo } from "react";
import { Layout, Button, theme, Avatar, Grid, Row } from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  BellOutlined,
} from "@ant-design/icons";
import Sidebar from "./Sidebar";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { API_BASE } from "../../utils/API_BASE";
import PushNotificationsCard from "../common/PushNotificationsCard";
const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

const DashboardLayout = () => {
  const screens = useBreakpoint();
  const [collapsed, setCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { user } = useContext(AuthContext);
  const nav = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const pageTitle = useMemo(() => {
    const routeTitles = {
      "/dashboard/user-management/view-users": "User Management",
      "/dashboard/user-management/activity-logs": "Activity Logs",
      "/dashboard/flight-log": "Flight Logs",
      "/dashboard/pre-inspection": "Pre-Inspection",
      "/dashboard/post-inspection": "Post-Inspection",
      "/dashboard/maintenance-log": "Maintenance Logs",
      "/dashboard/tasks": "Tasks",
      "/dashboard/mechanics": "Mechanics",
      "/dashboard/parts-lifespan-monitoring": "Parts Lifespan Monitoring",
      "/dashboard/maintenance-tracking": "Maintenance Tracking",
      "/dashboard/maintenance-priority": "Maintenance Priority Sorting",
      "/dashboard/parts-requisition": "Parts Requisition Monitoring",
      "/dashboard/maintenance-dashboard": "Reports and Analytics",
      "/dashboard/messages": "Messages",
      "/dashboard/profile": "Profile",
    };

    return routeTitles[location.pathname] || "Dashboard";
  }, [location.pathname]);

  return (
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      <Sider
        width={265}
        collapsible
        collapsed={collapsed}
        trigger={null}
        theme="light"
        breakpoint="lg"
        collapsedWidth={screens.xs ? 0 : 80}
        onBreakpoint={(broken) => {
          setCollapsed(broken);
        }}
        style={{
          position: screens.xs ? "fixed" : "relative", // fixed for mobile
          height: "100vh",
          zIndex: screens.xs ? 1200 : "auto",
          overflow: "auto",
          fontSize: 16,
        }}
      >
        <Sidebar
          collapsed={collapsed}
          onNavigate={() => screens.xs && setCollapsed(true)}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: colorBgContainer,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            padding: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: 16,
                width: 46,
                height: 46,
              }}
            />
            <span
              style={{
                fontSize: screens.xs ? 14 : 18,
                fontWeight: 600,
                color: "#1f1f1f",
                whiteSpace: "nowrap",
              }}
            >
              {pageTitle}
            </span>
          </div>
          <Row align="middle" gutter={16}>
            <Button
              icon={<BellOutlined />}
              style={{ marginRight: 16 }}
              onClick={() => setNotificationsOpen(true)}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
              }}
              onClick={() => nav("/dashboard/profile")}
            >
              {user?.image ? (
                <img
                  src={user.image.startsWith("http") ? user.image : `${API_BASE}${user.image}`}
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
              {screens.md && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    lineHeight: 1.2,
                    marginRight: 10,
                    marginLeft: 10,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>
                    {user?.firstName + " " + user?.lastName || "Unknown User"}
                  </span>
                  <span style={{ fontSize: 12, color: "#888" }}>
                    {user?.jobTitle || "Unknown Job Title"}
                  </span>
                </div>
              )}
            </div>
          </Row>
        </Header>

        <Content
          style={{
            height: "calc(100vh - 64px)",
            overflowY: "auto",
            overflowX: "hidden",
            background: "#efeeee",
            borderRadius: borderRadiusLG,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
      <PushNotificationsCard
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </Layout>
  );
};

export default DashboardLayout;
