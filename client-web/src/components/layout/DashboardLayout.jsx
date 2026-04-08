import React, { useState, useContext } from "react";
import { Layout, Button, theme, Avatar, Grid, Row } from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  BellOutlined,
} from "@ant-design/icons";
import Sidebar from "./Sidebar";
import { Outlet, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { API_BASE } from "../../utils/API_BASE";

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

const DashboardLayout = () => {
  const screens = useBreakpoint();
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useContext(AuthContext);
  const nav = useNavigate();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

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
          zIndex: screens.xs ? 1200 : "auto", // above content on mobile
          overflow: "auto",
        }}
        onClick={() => screens.xs && setCollapsed(true)}
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
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
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
          </div>
          <Row align="middle" gutter={16}>
            <Button icon={<BellOutlined />} style={{ marginRight: 16 }} />
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
          </Row>
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
