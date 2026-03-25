import React, { useState } from "react";
import { Row, Col, Button, message, Card, Typography, Space, Tag } from "antd";

import { ExportOutlined } from "@ant-design/icons";
import { FailureAnalysisChart } from "../../../components/common/FailureAnalysisChart";
import CUsageTable from "../../../components/tables/CUsageTable";
import { componentData } from "../../../components/common/MockData";

const { Title, Text } = Typography;
export default function ComponentUsage() {
  const [loading, setLoading] = useState(false);

  const currentMonthYear = new Date().toLocaleString("en-PH", {
    month: "long",
    year: "numeric",
  });
  const exportDocument = () => {
    message.success("Exported successfully");
  };
  const headers = [
    {
      title: "Aircraft",
      dataIndex: "aircraft",
      key: "aircraft",
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: "Date Installed",
      dataIndex: "dateInstalled",
      key: "dateInstalled",
    },
    {
      title: "Component",
      dataIndex: "component",
      key: "component",
    },
    {
      title: "Task",
      dataIndex: "task",
      key: "task",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const isMinor = status?.toLowerCase() === "minor";
        const isMajor = status?.toLowerCase() === "major";
        const isCritical = status?.toLowerCase() === "critical";

        const color = isMinor
          ? "cyan"
          : isMajor
            ? "orange"
            : isCritical
              ? "red"
              : "default";

        return (
          <Tag
            variant="solid"
            color={color}
            style={{
              fontWeight: 600,
              borderRadius: "4px",
              padding: "2px 8px",
            }}
          >
            {(status || "N/A").toUpperCase()}
          </Tag>
        );
      },
    },
  ];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        marginBottom: 100,
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

      <Row>
        <Col span={24}>
          <Card>
            <Space orientation="vertical">
              <Title level={3} style={{ margin: 0 }}>
                Most Failure-Prone Components
              </Title>
              <Text type="secondary">{currentMonthYear}</Text>
            </Space>
            <FailureAnalysisChart />
          </Card>
        </Col>
      </Row>
      <Row>
        <CUsageTable headers={headers} data={componentData} loading={loading} />
      </Row>
    </div>
  );
}
