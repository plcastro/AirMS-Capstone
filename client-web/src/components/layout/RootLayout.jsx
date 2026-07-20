import React from "react";
import { Layout, Row, Col, Card, Typography, Grid } from "antd";
import { Outlet } from "react-router-dom";
const AirMS_Hero = "/images/airms_hero.webp";
const AirMS_Hero640 = "/images/airms-hero_680.webp";
const AirMS_Hero412 = "/images/airms-hero_412.webp";
const Airms_LogoDark = "/images/airmslogo_dark.webp";
const { Content } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

const RootLayout = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  if (isMobile) {
    return (
      <Layout
        style={{
          minHeight: "100dvh",
          backgroundImage: `url(${AirMS_Hero412})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "top center",
          backgroundSize: "100% auto",
          backgroundColor: "#074134",
        }}
      >
        <div
          style={{
            height: "32vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            color: "#fff",
            background: "rgba(0,0,0,.35)",
            padding: "24px",
            textAlign: "center",
          }}
        >
          {/* Logo */}
          <img src={Airms_LogoDark} alt="AirMS" style={{ width: 180 }} />

          <h2 style={{ color: "#fff", margin: 0 }}>
            Aircraft Maintenance Made{" "}
            <span style={{ color: "#0ab973" }}>Smarter</span>
          </h2>
        </div>

        <Card
          style={{
            flex: 1,
            borderRadius: "32px 32px 0 0",
            marginTop: "-10px",
            border: "none",
            boxShadow: "none",
          }}
          styles={{
            body: {
              height: "100%",
            },
          }}
        >
          <Outlet />
        </Card>
      </Layout>
    );
  }
  return (
    <Layout
      style={{
        minHeight: "100dvh",
        backgroundColor: isMobile ? "transparent" : "#0f172a",
        backgroundImage: isMobile
          ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${AirMS_Hero412})`
          : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <Row style={{ minHeight: "100dvh" }}>
        <Col
          xs={0}
          md={12}
          style={{
            position: "relative",
            overflow: "hidden",
            minHeight: "100vh",
          }}
        >
          <picture>
            <source media="(max-width: 480px)" srcSet={AirMS_Hero412} />
            <source media="(max-width: 768px)" srcSet={AirMS_Hero640} />
            <img
              src={AirMS_Hero}
              alt="Aircraft Maintenance Made Smarter"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </picture>
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
              <span style={{ color: "#0ab973" }}>Smarter</span>
            </h1>

            <Text
              style={{
                opacity: 0.9,
                color: "white",
                fontSize: "1.25em",
              }}
            >
              Manage inspections, logs, and compliance in one unified platform.
            </Text>
          </div>
        </Col>

        <Col
          xs={24}
          md={12}
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
            styles={{ body: { padding: "18px 14px" } }}
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
