import React from "react";

import { Layout } from "antd";
import { Outlet } from "react-router-dom";
import AirMS_web from "../../assets/AirMS_web.png";

const { Content, Header } = Layout;
const headerStyle = {
  height: 64,
  paddingInline: 48,
  lineHeight: 64,
  width: "100%",
  display: "flex",
  alignItems: "center",
  background: "#fff",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
  zIndex: 1,
  justifyContent: "center",
};
const layoutStyle = {
  minHeight: "100vh",
  width: "100%",
  overflowX: "hidden",
  background: "#f5f5f5",
};

const contentStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "auto",
  flex: 1,
  width: "100%",
  overflow: "auto",
};

const RootLayout = () => {
  return (
    <Layout style={layoutStyle}>
      <Header style={headerStyle}>
        <img src={AirMS_web} alt="Logo" style={{ height: 45 }} />
      </Header>
      <Content style={contentStyle}>
        <Outlet />
      </Content>
    </Layout>
  );
};
export default RootLayout;
