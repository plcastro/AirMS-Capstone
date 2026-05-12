import React, { useMemo } from "react";
import { Row, Col, Card, Typography, Space, Tag } from "antd";

import { FailureAnalysisChart } from "../../../components/common/FailureAnalysisChart";
import CUsageTable from "../../../components/tables/CUsageTable";

const { Title, Text } = Typography;
const parseNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getComponentStatus = (part = {}) => {
  const dueText = String(part.due || "").toLowerCase();
  const daysRemaining = parseNumber(part.daysRemaining);
  const hoursRemaining = parseNumber(part.timeRemaining);

  if (
    dueText.includes("overdue") ||
    dueText.includes("due") ||
    (daysRemaining !== null && daysRemaining <= 0) ||
    (hoursRemaining !== null && hoursRemaining <= 0)
  ) {
    return "critical";
  }

  if (
    (daysRemaining !== null && daysRemaining <= 30) ||
    (hoursRemaining !== null && hoursRemaining <= 50)
  ) {
    return "major";
  }

  return "minor";
};

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-CA");
};

export default function ComponentUsage({ records = [], loading = false }) {
  const data = useMemo(
    () =>
      records.flatMap((record) =>
        (record.parts || [])
          .filter((part) => part.rowType !== "header" && part.componentName)
          .map((part) => ({
            key: `${record._id || record.aircraft}-${part._id}`,
            aircraft: record.aircraft,
            dateInstalled: part.dateCW || formatDate(record.dateManufactured),
            component: part.componentName,
            task:
              part.due ||
              part.dateDue ||
              part.ttCycleDue ||
              "Parts lifespan monitoring",
            status: getComponentStatus(part),
          })),
      ),
    [records],
  );

  const chartData = useMemo(() => {
    const counts = data.reduce((acc, item) => {
      if (item.status !== "critical") return acc;
      acc[item.component] = (acc[item.component] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([name, failures]) => ({ name, failures }))
      .sort((a, b) => b.failures - a.failures)
      .slice(0, 8);
  }, [data]);

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
            <FailureAnalysisChart data={chartData} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <CUsageTable headers={headers} data={data} loading={loading} />
        </Col>
      </Row>
    </div>
  );
}
