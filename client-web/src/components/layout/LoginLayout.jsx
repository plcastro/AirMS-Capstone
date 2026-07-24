import React from "react";
import AirMS_web from "../../assets/AirMS_web.webp";
import { Typography, Row, Col, Grid } from "antd";
import "../../pages/auth/login.css";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function LoginLayout({
  title = "Sign in to access your AirMS Account",
  subtitle = "",
  children,
}) {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: isMobile ? "100%" : 560,
        margin: "0 auto",
        padding: isMobile ? "8px 12px" : "20px",
      }}
    >
      {/* Desktop only */}
      {!isMobile && (
        <Row justify="center">
          <Col
            span={24}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <img
              src={AirMS_web}
              alt="AirMS Logo"
              style={{ width: 200, marginBottom: 8 }}
            />

            <Text style={{ fontWeight: 300 }}>
              AIRCRAFT MAINTENANCE MANAGEMENT SYSTEM
            </Text>
          </Col>
        </Row>
      )}

      <Row style={{ marginBottom: 20 }}>
        <Col span={24}>
          <Title
            level={3}
            style={{
              marginBottom: 6,
              textAlign: isMobile ? "center" : "left",
            }}
          >
            {title}
          </Title>
        </Col>

        <Col span={24}>
          <Text
            style={{
              display: "block",
              textAlign: isMobile ? "center" : "left",
              fontWeight: 300,
            }}
          >
            {subtitle}
          </Text>
        </Col>
      </Row>

      {children}
    </div>
  );
}
