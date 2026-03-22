import React from "react";
import {
  Card,
  Col,
  Row,
  Statistic,
  Space,
  Typography,
  Button,
  message,
} from "antd";
import { ExportOutlined } from "@ant-design/icons";
import AreaChartComponent from "../../../components/common/AreaChart";
const { Title, Text } = Typography;

export default function MaintenancePerformance() {
  const currentMonthYear = new Date().toLocaleString("en-PH", {
    month: "long",
    year: "numeric",
  });

  const exportDocument = () => {
    message.success("Exported successfully");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        marginBottom: 300,
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

      <div style={{ display: "flex" }}>
        <Row gutter={24} style={{ flex: 1 }}>
          <Col span={8}>
            <Card variant="borderless">
              <Statistic
                title="Total Tasks"
                value={534}
                styles={{ content: { color: "#000000" } }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card variant="borderless">
              <Statistic
                title="Completed Tasks"
                value={34}
                styles={{ content: { color: "#048a25" } }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card variant="borderless">
              <Statistic
                title="Overdue"
                value={5}
                styles={{ content: { color: "#cf1322" } }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <Card>
        <Space orientation="vertical" size={0}>
          <Title level={3} style={{ margin: 0 }}>
            Maintenance Performance
          </Title>
          <Text type="secondary">{currentMonthYear}</Text>
        </Space>
        <AreaChartComponent />
      </Card>
    </div>
  );
}
