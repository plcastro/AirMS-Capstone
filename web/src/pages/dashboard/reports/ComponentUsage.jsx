import React, { useState } from "react";
import { Row, Col, Button, message, Card, Typography, Space, Tag } from "antd";

import { FailureAnalysisChart } from "../../../components/common/FailureAnalysisChart";
import CUsageTable from "../../../components/tables/CUsageTable";

const { Title, Text } = Typography;
export default function ComponentUsage({ data }) {
  const [loading, setLoading] = useState(false);

  const currentMonthYear = new Date().toLocaleString("en-PH", {
    month: "long",
    year: "numeric",
  });

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
        gap: 10,
        marginBottom: "5%",
      }}
    >
      <Row gutter={12}>
        <Col xs={24} md={12}>
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
        <Col xs={24} md={12}>
          <CUsageTable headers={headers} data={data} loading={loading} />
        </Col>
      </Row>
    </div>
  );
}
