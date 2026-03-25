import React from "react";
import { Row, Button, message, Card, Typography, Space } from "antd";

import { ExportOutlined } from "@ant-design/icons";
import { FailureAnalysisChart } from "../../../components/common/FailureAnalysisChart";

const { Title, Text } = Typography;
export default function ComponentUsage() {
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
      <Card>
        <Space orientation="vertical">
          <Title level={3} style={{ margin: 0 }}>
            Most Failure-Prone Components
          </Title>
          <Text type="secondary">{currentMonthYear}</Text>
        </Space>
        <FailureAnalysisChart />
      </Card>
    </div>
  );
}
