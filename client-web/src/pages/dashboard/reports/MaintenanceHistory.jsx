import React from "react";
import { Row, Col, Card, Typography } from "antd";

import { SDMChart, ARTChart } from "../../../components/common/PieChart";
import MHistoryTable from "../../../components/tables/MHistoryTable";

const { Title } = Typography;

const PIE_COLORS = [
  "#881fe5",
  "#1890ff",
  "#058b4a",
  "#cebc14",
  "#ffae18",
  "#ac139f",
];
const ART_COLORS = ["#881fe5", "#1890ff", "#058b4a", "#d78f2b", "#9b1104"];

const formatDate = (value) => {
  if (!value) return "---";

  const date = new Date(value);
  if (isNaN(date.getTime())) return "---";

  return date.toLocaleDateString("en-CA");
};

export default function MaintenanceHistory({ tasks = [], loading = false }) {
  const historyRows = tasks.map((task, index) => ({
    key: task._id || task.id || `${task.title}-${index}`,
    aircraft: task.aircraft || "---",
    dateDiscovered: formatDate(
      task.maintenanceHistory?.defectDiscoveredAt || task.dateDiscovered,
    ),
    dateRectified: formatDate(
      task.maintenanceHistory?.defectRectifiedAt ||
        task.dateRectified ||
        task.completedAt,
    ),
    task: task.title || task.summary?.category || "---",
    assignedMechanic:
      task.assignedMechanic || task.assignedToName || task.assignedTo || "---",
  }));

  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const recentTasks = tasks.filter((task) => {
    const discoveredAt =
      task.maintenanceHistory?.defectDiscoveredAt || task.dateDiscovered;

    if (!discoveredAt) return false;

    const date = new Date(discoveredAt);
    return !isNaN(date.getTime()) && date.getTime() >= cutoff;
  });

  const sameDayRepairMap = recentTasks.reduce((acc, task) => {
    const aircraft = task.aircraft || "Unassigned";
    const discoveredAt =
      task.maintenanceHistory?.defectDiscoveredAt || task.dateDiscovered;
    const rectifiedAt =
      task.maintenanceHistory?.defectRectifiedAt ||
      task.dateRectified ||
      task.completedAt;

    if (!discoveredAt || !rectifiedAt) return acc;

    const discovered = new Date(discoveredAt);
    const rectified = new Date(rectifiedAt);
    if (isNaN(discovered.getTime()) || isNaN(rectified.getTime())) return acc;

    const sameDay =
      task.maintenanceHistory?.sameDayRepair ||
      discovered.toDateString() === rectified.toDateString();

    if (!sameDay) return acc;

    acc[aircraft] = (acc[aircraft] || 0) + 1;
    return acc;
  }, {});

  const rectificationBuckets = recentTasks.reduce(
    (acc, task) => {
      const discoveredAt =
        task.maintenanceHistory?.defectDiscoveredAt || task.dateDiscovered;
      const rectifiedAt =
        task.maintenanceHistory?.defectRectifiedAt ||
        task.dateRectified ||
        task.completedAt;

      if (!discoveredAt || !rectifiedAt) return acc;

      const discovered = new Date(discoveredAt);
      const rectified = new Date(rectifiedAt);
      if (isNaN(discovered.getTime()) || isNaN(rectified.getTime())) return acc;

      const diffDays = Math.max(
        0,
        Math.ceil(
          (rectified.getTime() - discovered.getTime()) / (1000 * 60 * 60 * 24),
        ),
      );

      const bucket =
        diffDays <= 10
          ? "0 - 10 days"
          : diffDays <= 20
            ? "11 - 20 days"
            : diffDays <= 30
              ? "21 - 30 days"
              : diffDays <= 40
                ? "31 - 40 days"
                : "More than 40 days";

      acc[bucket] = (acc[bucket] || 0) + 1;
      return acc;
    },
    {
      "0 - 10 days": 0,
      "11 - 20 days": 0,
      "21 - 30 days": 0,
      "31 - 40 days": 0,
      "More than 40 days": 0,
    },
  );

  const sdmChartData = Object.entries(sameDayRepairMap).map(
    ([name, value], index) => ({
      name,
      value,
      fill: PIE_COLORS[index % PIE_COLORS.length],
    }),
  );

  const artChartData = Object.entries(rectificationBuckets).map(
    ([name, value], index) => ({
      name,
      value,
      fill: ART_COLORS[index % ART_COLORS.length],
    }),
  );

  const headers = [
    {
      title: "Aircraft",
      dataIndex: "aircraft",
      key: "aircraft",
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: "Date Defect Discovered",
      dataIndex: "dateDiscovered",
      key: "dateDiscovered",
    },
    {
      title: "Date Defect Rectified",
      dataIndex: "dateRectified",
      key: "dateRectified",
    },
    {
      title: "Task",
      dataIndex: "task",
      key: "task",
    },
    {
      title: "Assigned Mechanic",
      dataIndex: "assignedMechanic",
      key: "assignedMechanic",
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        marginBottom: 10,
      }}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card style={{ padding: 10 }}>
            <Title level={5} style={{ margin: 0 }}>
              Same-day Repairs (Last 30 days)
            </Title>
            <SDMChart data={sdmChartData} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card style={{ padding: 10 }}>
            <Title level={5} style={{ margin: 0 }}>
              Average Rectification Time
            </Title>
            <ARTChart data={artChartData} />
          </Card>
        </Col>
      </Row>
      <Row>
        <MHistoryTable headers={headers} data={historyRows} loading={loading} />
      </Row>
    </div>
  );
}
