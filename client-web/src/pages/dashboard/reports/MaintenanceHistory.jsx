import React, { useMemo, useState } from "react";
import { Row, Col, Card, Typography } from "antd";

import { SDMChart, ARTChart } from "../../../components/common/PieChart";
import MHistoryTable from "../../../components/tables/MHistoryTable";

const { Title, Text } = Typography;

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

const getDiscoveredAt = (task = {}) =>
  task.maintenanceHistory?.defectDiscoveredAt ||
  task.dateDiscovered ||
  task.createdAt;

const getRectifiedAt = (task = {}) =>
  task.maintenanceHistory?.defectRectifiedAt ||
  task.dateRectified ||
  task.approvedAt ||
  task.completedAt ||
  task.updatedAt;

const getRectificationBucket = (discoveredAt, rectifiedAt) => {
  if (!discoveredAt || !rectifiedAt) return null;

  const discovered = new Date(discoveredAt);
  const rectified = new Date(rectifiedAt);
  if (isNaN(discovered.getTime()) || isNaN(rectified.getTime())) return null;

  const diffHours = Math.max(
    0,
    Math.ceil((rectified.getTime() - discovered.getTime()) / (1000 * 60 * 60)),
  );

  if (diffHours <= 1) return "0 - 1 hours";
  if (diffHours <= 3) return "2 - 3 hours";
  if (diffHours <= 6) return "4 - 6 hours";
  if (diffHours <= 12) return "7 - 12 hours";
  return "More than 12 hours";
};

const getRectificationHours = (discoveredAt, rectifiedAt) => {
  if (!discoveredAt || !rectifiedAt) return null;

  const discovered = new Date(discoveredAt);
  const rectified = new Date(rectifiedAt);
  if (isNaN(discovered.getTime()) || isNaN(rectified.getTime())) return null;

  return Math.max(
    0,
    (rectified.getTime() - discovered.getTime()) / (1000 * 60 * 60),
  );
};

export default function MaintenanceHistory({ tasks = [], loading = false }) {
  const [selectedAircraft, setSelectedAircraft] = useState(null);
  const [selectedRectificationBucket, setSelectedRectificationBucket] =
    useState(null);

  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const tasksWithMeta = tasks.map((task, index) => {
    const discoveredAtRaw = getDiscoveredAt(task);
    const rectifiedAtRaw = getRectifiedAt(task);
    const discoveredDate = discoveredAtRaw ? new Date(discoveredAtRaw) : null;
    const rectifiedDate = rectifiedAtRaw ? new Date(rectifiedAtRaw) : null;
    const hasValidDiscoveredDate =
      discoveredDate && !isNaN(discoveredDate.getTime());
    const hasValidRectifiedDate =
      rectifiedDate && !isNaN(rectifiedDate.getTime());
    const isRecent = hasValidDiscoveredDate && discoveredDate.getTime() >= cutoff;
    const isSameDay =
      hasValidDiscoveredDate &&
      hasValidRectifiedDate &&
      (task.maintenanceHistory?.sameDayRepair ||
        discoveredDate.toDateString() === rectifiedDate.toDateString());

    const rectificationBucket = getRectificationBucket(
      discoveredAtRaw,
      rectifiedAtRaw,
    );
    const rectificationHours = getRectificationHours(
      discoveredAtRaw,
      rectifiedAtRaw,
    );

    return {
      task,
      index,
      row: {
        key: task._id || task.id || `${task.title}-${index}`,
        aircraft: task.aircraft || "---",
        dateDiscovered: formatDate(discoveredAtRaw),
        dateRectified: formatDate(rectifiedAtRaw),
        task: task.title || task.summary?.category || "---",
        assignedMechanic:
          task.assignedMechanic ||
          task.assignedToName ||
          task.assignedTo ||
          "---",
      },
      aircraft: task.aircraft || "Unassigned",
      isRecent,
      isSameDay,
      rectificationBucket,
      rectificationHours,
    };
  });

  const recentTasks = tasksWithMeta.filter((entry) => entry.isRecent);

  const historyRows = useMemo(
    () =>
      tasksWithMeta
        .filter((entry) => {
          const aircraftMatch =
            !selectedAircraft ||
            (entry.isRecent &&
              entry.isSameDay &&
              entry.aircraft === selectedAircraft);
          const bucketMatch =
            !selectedRectificationBucket ||
            (entry.isRecent &&
              entry.rectificationBucket === selectedRectificationBucket);
          return aircraftMatch && bucketMatch;
        })
        .map((entry) => entry.row),
    [tasksWithMeta, selectedAircraft, selectedRectificationBucket],
  );

  const sameDayRepairMap = recentTasks.reduce((acc, entry) => {
    if (!entry.isSameDay) return acc;

    acc[entry.aircraft] = (acc[entry.aircraft] || 0) + 1;
    return acc;
  }, {});

  const rectificationBuckets = recentTasks.reduce(
    (acc, entry) => {
      if (!entry.rectificationBucket) return acc;

      acc[entry.rectificationBucket] = (acc[entry.rectificationBucket] || 0) + 1;
      return acc;
    },
    {
      "0 - 1 hours": 0,
      "2 - 3 hours": 0,
      "4 - 6 hours": 0,
      "7 - 12 hours": 0,
      "More than 12 hours": 0,
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

  const topSameDay = sdmChartData.reduce(
    (top, item) => (item.value > top.value ? item : top),
    { name: "N/A", value: 0 },
  );
  const totalSameDay = sdmChartData.reduce((sum, item) => sum + item.value, 0);
  const sameDayInterpretation =
    totalSameDay > 0
      ? `${topSameDay.name} has the highest same-day repair share (${((topSameDay.value / totalSameDay) * 100).toFixed(1)}%). Click a slice to filter the table.`
      : "No same-day repair activity was recorded in the last 30 days.";

  const rectificationHourValues = tasksWithMeta
    .map((entry) => entry.rectificationHours)
    .filter((value) => Number.isFinite(value));
  const averageCompletionHours =
    rectificationHourValues.length > 0
      ? rectificationHourValues.reduce((sum, value) => sum + value, 0) /
        rectificationHourValues.length
      : null;
  const artInterpretation =
    averageCompletionHours !== null
      ? `Average rectification time is ${averageCompletionHours.toFixed(1)} hour(s) across ${rectificationHourValues.length} rectification record(s). Click a slice to filter the table.`
      : "No rectification duration data is available.";

  const filterInterpretation =
    selectedAircraft || selectedRectificationBucket
      ? `Table filters active: ${selectedAircraft ? `same-day aircraft = ${selectedAircraft}` : ""}${selectedAircraft && selectedRectificationBucket ? ", " : ""}${selectedRectificationBucket ? `rectification time = ${selectedRectificationBucket}` : ""}. Click the same slice again to clear each filter.`
      : "No chart filter is applied. Click any pie slice to filter the table.";

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
            <SDMChart
              data={sdmChartData}
              onSliceClick={(slice) => {
                const clickedName = slice?.name;
                if (!clickedName) return;
                setSelectedAircraft((prev) =>
                  prev === clickedName ? null : clickedName,
                );
              }}
            />
            <Text type="secondary">{sameDayInterpretation}</Text>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card style={{ padding: 10 }}>
            <Title level={5} style={{ margin: 0 }}>
              Average Rectification Time (Hours)
            </Title>
            <ARTChart
              data={artChartData}
              centerValue={
                averageCompletionHours !== null
                  ? `${averageCompletionHours.toFixed(1)}h`
                  : "N/A"
              }
              centerLabel="Avg. Rectification"
              onSliceClick={(slice) => {
                const clickedName = slice?.name;
                if (!clickedName) return;
                setSelectedRectificationBucket((prev) =>
                  prev === clickedName ? null : clickedName,
                );
              }}
            />
            <Text type="secondary">{artInterpretation}</Text>
          </Card>
        </Col>
      </Row>
      <Row>
        <Col span={24}>
          <Text style={{ marginBottom: 8, display: "block" }} type="secondary">
            {filterInterpretation}
          </Text>
          <MHistoryTable headers={headers} data={historyRows} loading={loading} />
        </Col>
      </Row>
    </div>
  );
}
