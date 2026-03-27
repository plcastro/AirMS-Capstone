import React from "react";
import { Card, Col, Row, Statistic, Space, Typography } from "antd";

import AreaChartComponent from "../../../components/common/AreaChart";
const { Title, Text } = Typography;

export default function MaintenancePerformance() {
  const currentMonthYear = new Date().toLocaleString("en-PH", {
    month: "long",
    year: "numeric",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex" }}>
        <Row gutter={12} style={{ flex: 1 }}>
          <Col xs={24} sm={10} md={8}>
            <Card variant="borderless">
              <Statistic
                title="Total Tasks"
                value={534}
                styles={{
                  content: {
                    color: "#000000",
                    fontSize: "clamp(16px, 3.2vw, 32px)",
                  },
                }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={10} md={8}>
            <Card variant="borderless">
              <Statistic
                title="Completed Tasks"
                value={34}
                styles={{
                  content: {
                    color: "#048a25",
                    fontSize: "clamp(16px, 3.2vw, 32px)",
                  },
                }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={10} md={8}>
            <Card variant="borderless">
              <Statistic
                title="Overdue"
                value={5}
                styles={{
                  content: {
                    color: "#cf1322",
                    fontSize: "clamp(16px, 3.2vw, 32px)",
                  },
                }}
              />
            </Card>
          </Col>
        </Row>
      </div>
      <Row gutter={21}>
        <Col xs={24} md={12}>
          <Card>
            <Space orientation="vertical" size={0}>
              <Title level={4} style={{ margin: 0 }}>
                Maintenance Performance
              </Title>
              <Text type="secondary">{currentMonthYear}</Text>
            </Space>
            <AreaChartComponent />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
