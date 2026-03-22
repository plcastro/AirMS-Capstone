import React from "react";
import { Row, Col, message, Button, Card, Typography } from "antd";
import { ExportOutlined } from "@ant-design/icons";
import { SDMChart, ARTChart } from "../../../components/common/PieChart";

const { Title, Text } = Typography;

export default function MaintenanceHistory() {
  const exportDocument = () => {
    message.success("Exported successfully");
  };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <Row style={{ justifyContent: "flex-end" }}>
        <div>
          <Button
            type="primary"
            icon={<ExportOutlined />}
            onClick={() => exportDocument()}
          >
            Export
          </Button>
        </div>
      </Row>
      <Row gutter={24}>
        <Col xs={24} md={12}>
          <Card>
            <Title level={4} style={{ margin: 0 }}>
              Same-day Repairs (Last 30 days)
            </Title>
            <SDMChart />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card>
            <Title level={4} style={{ margin: 0 }}>
              Average Rectification Time
            </Title>
            <ARTChart />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
