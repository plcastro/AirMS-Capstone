import React from "react";

import { Flex, Layout } from "antd";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

const { Content } = Layout;

const layoutStyle = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  alignItems: "center",
  justifyContent: "center",
  overflowX: "hidden",
  height: "100vh",
};

const contentStyle = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  height: "100vh",
  width: "100%",
  overflowX: "hidden",
};

const RootLayout = () => {
  return (
    <Layout style={layoutStyle}>
      <Navbar />
      <Content style={contentStyle}>
        <Outlet />
      </Content>
    </Layout>
  );
};
export default RootLayout;
