import React from "react";
import AirMS_web from "../../assets/AirMS_web.png";
import { Typography, Row, Col, Space, Grid } from "antd";
import "../../pages/auth/login.css";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function LoginLayout({
  title = "Welcome Back",
  subtitle = "Sign in to access your AirMS Account",
  children,
}) {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  return (
    <div style={{ padding: isMobile ? "8px 4px" : "8px 0" }}>
      <Row style={{ marginBottom: isMobile ? 20 : 30 }} align="middle" justify="center">
        <Space orientation="vertical" size="small">
          <Col span={24} style={{ display: "flex", justifyContent: "center" }}>
            <img src={AirMS_web} alt="logo" style={{ width: isMobile ? 170 : 200 }} />
          </Col>
          <Col span={24} style={{ display: "flex", justifyContent: "center", textAlign: "center" }}>
            <Text style={{ fontWeight: "lighter" }}>
              AIRCRAFT MAINTENANCE MANAGEMENT SYSTEM
            </Text>
          </Col>
        </Space>
      </Row>

      <Row style={{ marginBottom: isMobile ? 16 : 20 }}>
        <Col span={24}>
          <Title
            level={3}
            style={{ textAlign: "left", fontWeight: "bold", marginBottom: 6 }}
          >
            {title}
          </Title>
        </Col>
        <Col span={24}>
          <Text style={{ fontWeight: "lighter" }}>{subtitle}</Text>
        </Col>
      </Row>

      {children}
    </div>
  );
}
