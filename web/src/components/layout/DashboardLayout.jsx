import React, { useState, useContext } from "react";
import { Layout, Button, theme, Avatar, Grid } from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
} from "@ant-design/icons";
import Sidebar from "./Sidebar";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { API_BASE } from "../../utils/API_BASE";

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

const DashboardLayout = () => {
  const screens = useBreakpoint();
  const titleFontSize = screens.md ? 20 : 16;
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const nav = useNavigate();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const pageMap = {
    "/dashboard/user-management/view-users": "Users",
    "/dashboard/user-management/activity-logs": "Activity Logs",
    "/dashboard/flight-log": "Flight Logs",
    "/dashboard/maintenance-log": "Maintenance Logs",
    "/dashboard/parts-monitoring/pm-table": "PM Table",
    "/dashboard/parts-monitoring/maintenance-tracking": "Maintenance Tracking",
    "/dashboard/inventory-management": "Inventory Management",
    "/dashboard/maintenance-priority": "Maintenance Priority",
    "/dashboard/maintenance-dashboard": "Maintenance Dashboard",
    "/dashboard/profile": "Profile",
  };
  const pageTitle = pageMap[location.pathname] || "Dashboard";

  return (
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      <Sider
        width={265}
        collapsible
        collapsed={collapsed}
        trigger={null}
        theme="light"
      >
        <Sidebar collapsed={collapsed} />
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
              justifyContent: "center",
            }}
          >
            <div>
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
            </div>
            <h2
              style={{
                fontSize: titleFontSize,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontWeight: 600,
                transition: "all 0.3s",
              }}
            >
              {pageTitle}
            </h2>
          </div>
          <div
            style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
            onClick={() => nav("/dashboard/profile")}
          >
            {user?.image ? (
              <img
                src={user?.image ? `${API_BASE}${user.image}` : ""}
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
        </Header>

        <Content
          style={{
            minHeight: "calc(100vh - 64px)",
            background: "#efeeee",
            borderRadius: borderRadiusLG,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default DashboardLayout;
