import React from "react";

import { Flex, Layout } from "antd";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

const { Header, Content } = Layout;

const headerStyle = {
  color: "#fff",
  height: 64,
  lineHeight: "64px",
};
const layoutStyle = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  overflowX: "hidden",
};

const contentStyle = {
  minHeight: "100vh",
  width: "100%",
};

const RootLayout = () => {
  return (
    <Flex gap="middle" wrap>
      <Layout style={layoutStyle}>
        <Header style={headerStyle}>
          <Navbar />
        </Header>
        <Content style={contentStyle}>
          <Outlet />
        </Content>
      </Layout>
    </Flex>
  );
};
export default RootLayout;
