import React from "react";
import { Layout, Row, Col, Card, Typography, Grid } from "antd";
import { Outlet } from "react-router-dom";
import AirMS_Hero from "../../assets/airms_hero.png";

const { Content } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

const RootLayout = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  return (
    <Layout
      style={{
        minHeight: "100dvh",
        backgroundColor: isMobile ? "transparent" : "#0f172a",
        backgroundImage: isMobile
          ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${AirMS_Hero})`
          : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <Row style={{ minHeight: "100dvh" }}>
        <Col
          xs={0}
          md={14}
          style={{
            position: "relative",
            backgroundImage: `url(${AirMS_Hero})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            minHeight: "100vh",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0, 0, 0, 0.28)",
            }}
          />
          <div
            style={{
              position: "relative",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "0 40px",
              color: "white",
              width: isMobile ? "100%" : "75%",
            }}
          >
            <h1 style={{ fontSize: "3em", color: "white" }}>
              Aircraft Maintenance Made{" "}
              <span style={{ color: "#07a264" }}>Smarter</span>
            </h1>

            <Text style={{ opacity: 0.9, maxWidth: "360px", color: "white" }}>
              Manage inspections, logs, and compliance in one unified platform.
            </Text>
          </div>
        </Col>

        <Col
          xs={24}
          md={10}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: isMobile ? "16px" : "28px",
            background: isMobile ? "transparent" : "#f8fafc",
          }}
        >
          <Card
            style={{
              width: "100%",
              maxWidth: isMobile ? "100%" : "550px",
              background: isMobile
                ? "rgba(255,255,255,0.95)"
                : "rgba(255,255,255,0.9)",
              borderRadius: "16px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
              backdropFilter: "blur(10px)",
            }}
            styles={{ body: { padding: isMobile ? "18px 14px" : "28px 26px" } }}
          >
            <Content style={{ width: "100%" }}>
              <Outlet />
            </Content>
          </Card>
        </Col>
      </Row>
    </Layout>
  );
};

export default RootLayout;
