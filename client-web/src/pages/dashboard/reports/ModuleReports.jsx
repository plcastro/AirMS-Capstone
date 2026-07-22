import React, { useMemo, useState } from "react";
import { Card, Col, Row, Segmented, Space, Table, Typography } from "antd";
import { renderStatusTag } from "../../../utils/statusTags";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const { Text, Title } = Typography;

const COLORS = [
  "#26866f",
  "#1890ff",
  "#faad14",
  "#f5222d",
  "#722ed1",
  "#13c2c2",
  "#eb2f96",
  "#52c41a",
];

const normalizeStatus = (value) =>
  String(value || "Unknown")
    .replace(/_/g, " ")
    .trim();

const formatDate = (value) => {
  if (!value) return "---";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "---";
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
};

const getRecordDate = (record = {}) =>
  record.date ||
  record.dateRequested ||
  record.dateAdded ||
  record.createdAt ||
  record.updatedAt;

const countBy = (records, getKey) =>
  records.reduce((acc, record) => {
    const key = getKey(record) || "Unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

const toChartData = (counts) =>
  Object.entries(counts).map(([name, value]) => ({ name, value }));

const getWeekStart = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const day = next.getDay();
  next.setDate(next.getDate() - day);
  return next;
};

const buildTimeSeriesData = (records, timeframe = "monthly") => {
  const buckets = {};

  records.forEach((record) => {
    const rawDate = getRecordDate(record);
    const date = new Date(rawDate);

    if (Number.isNaN(date.getTime())) {
      buckets["No date"] = {
        label: "No date",
        order: Number.MAX_SAFE_INTEGER,
        value: (buckets["No date"]?.value || 0) + 1,
      };
      return;
    }

    if (timeframe === "yearly") {
      const year = date.getFullYear();
      const key = `${year}`;
      buckets[key] = {
        label: key,
        order: year,
        value: (buckets[key]?.value || 0) + 1,
      };
      return;
    }

    if (timeframe === "weekly") {
      const weekStart = getWeekStart(date);
      const key = weekStart.toISOString().slice(0, 10);
      buckets[key] = {
        label: weekStart.toLocaleDateString("en-US"),
        order: weekStart.getTime(),
        value: (buckets[key]?.value || 0) + 1,
      };
      return;
    }

    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const key = monthStart.toISOString().slice(0, 7);
    buckets[key] = {
      label: monthStart.toLocaleDateString("en-US"),
      order: monthStart.getTime(),
      value: (buckets[key]?.value || 0) + 1,
    };
  });

  return Object.values(buckets)
    .sort((a, b) => a.order - b.order)
    .map((row) => ({ month: row.label, value: row.value }));
};

const StatusTag = ({ status }) => {
  const label = normalizeStatus(status);
  return renderStatusTag(label);
};

const EmptyChart = () => (
  <div style={{ textAlign: "center", padding: 40 }}>
    <Text type="secondary">No data available</Text>
  </div>
);

const StatusPie = ({ data }) => {
  if (!data.length) return <EmptyChart />;

  return (
    <ResponsiveContainer width="100%" height={230}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={68}
          label
        >
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend verticalAlign="bottom" height={36} />
      </PieChart>
    </ResponsiveContainer>
  );
};

const MonthlyBar = ({ data, dataKey = "value", name = "Records" }) => {
  if (!data.length) return <EmptyChart />;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Bar
          dataKey={dataKey}
          name={name}
          fill="#26866f"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

const buildAircraftData = (records, getAircraft) =>
  toChartData(countBy(records, getAircraft))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

const ReportSection = ({ title, subtitle, children }) => (
  <Space orientation="vertical" size={12} style={{ width: "100%" }}>
    <Space orientation="vertical" size={0}>
      <Title level={5} style={{ margin: 0 }}>
        {title}
      </Title>
      {subtitle && <Text type="secondary">{subtitle}</Text>}
    </Space>
    {children}
  </Space>
);

export function FlightLogReport({ records = [], loading = false }) {
  const [timeframe, setTimeframe] = useState("monthly");
  const statusData = useMemo(
    () =>
      toChartData(countBy(records, (record) => normalizeStatus(record.status))),
    [records],
  );
  const monthlyData = useMemo(
    () => buildTimeSeriesData(records, timeframe),
    [records, timeframe],
  );
  const aircraftData = useMemo(
    () => buildAircraftData(records, (record) => record.rpc || "Unknown"),
    [records],
  );

  const columns = [
    { title: "Control No.", dataIndex: "controlNo", key: "controlNo" },
    { title: "Aircraft", dataIndex: "rpc", key: "rpc" },
    { title: "Date", dataIndex: "date", key: "date", render: formatDate },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => <StatusTag status={status} />,
    },
  ];

  return (
    <ReportSection
      title="Flight Log Report"
      subtitle="Flight log volume, aircraft activity, and release workflow status."
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Logs by Month">
            <Segmented
              size="small"
              value={timeframe}
              onChange={setTimeframe}
              options={[
                { label: "Year", value: "yearly" },
                { label: "Month", value: "monthly" },
                { label: "Week", value: "weekly" },
              ]}
              style={{ marginBottom: 12 }}
            />
            <MonthlyBar data={monthlyData} name="Flight logs" />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Workflow Status">
            <StatusPie data={statusData} />
          </Card>
        </Col>
        <Col xs={24}>
          <Card title="Aircraft Activity">
            <MonthlyBar
              data={aircraftData.map((item) => ({
                month: item.name,
                value: item.value,
              }))}
              name="Logs"
            />
          </Card>
        </Col>
        <Col xs={24}>
          <Table
            size={"small"}
            columns={columns}
            dataSource={records.map((record, index) => ({
              ...record,
              key: record._id || index,
            }))}
            loading={loading}
            pagination={{ pageSize: 5 }}
            scroll={{ x: true }}
          />
        </Col>
      </Row>
    </ReportSection>
  );
}

export function InspectionReport({
  title,
  records = [],
  loading = false,
  aircraftLabel = "rpc",
}) {
  const [timeframe, setTimeframe] = useState("monthly");
  const statusData = useMemo(
    () =>
      toChartData(countBy(records, (record) => normalizeStatus(record.status))),
    [records],
  );
  const monthlyData = useMemo(
    () => buildTimeSeriesData(records, timeframe),
    [records, timeframe],
  );
  const aircraftData = useMemo(
    () =>
      buildAircraftData(
        records,
        (record) => record[aircraftLabel] || "Unknown",
      ),
    [records, aircraftLabel],
  );

  const completedCount = records.filter(
    (record) => normalizeStatus(record.status).toLowerCase() === "completed",
  ).length;
  const completionRate = records.length
    ? Math.round((completedCount / records.length) * 100)
    : 0;

  const columns = [
    { title: "Aircraft", dataIndex: aircraftLabel, key: "aircraft" },
    { title: "Aircraft Type", dataIndex: "aircraftType", key: "aircraftType" },
    { title: "Date", dataIndex: "date", key: "date", render: formatDate },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => <StatusTag status={status} />,
    },
    { title: "Created By", dataIndex: "createdBy", key: "createdBy" },
  ];

  return (
    <ReportSection
      title={title}
      subtitle={`Inspection completion rate: ${completionRate}% across ${records.length} records.`}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Inspections by Month">
            <Segmented
              size="small"
              value={timeframe}
              onChange={setTimeframe}
              options={[
                { label: "Year", value: "yearly" },
                { label: "Month", value: "monthly" },
                { label: "Week", value: "weekly" },
              ]}
              style={{ marginBottom: 12 }}
            />
            <MonthlyBar data={monthlyData} name="Inspections" />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Inspection Status">
            <StatusPie data={statusData} />
          </Card>
        </Col>
        <Col xs={24}>
          <Card title="Inspections by Aircraft">
            <MonthlyBar
              data={aircraftData.map((item) => ({
                month: item.name,
                value: item.value,
              }))}
              name="Inspections"
            />
          </Card>
        </Col>
        <Col xs={24}>
          <Table
            size={"small"}
            columns={columns}
            dataSource={records.map((record, index) => ({
              ...record,
              key: record._id || index,
            }))}
            loading={loading}
            pagination={{ pageSize: 5 }}
            scroll={{ x: true }}
          />
        </Col>
      </Row>
    </ReportSection>
  );
}

export function PartsRequisitionReport({ records = [], loading = false }) {
  const [timeframe, setTimeframe] = useState("monthly");
  const statusData = useMemo(
    () =>
      toChartData(countBy(records, (record) => normalizeStatus(record.status))),
    [records],
  );
  const monthlyData = useMemo(
    () => buildTimeSeriesData(records, timeframe),
    [records, timeframe],
  );
  const itemStatusData = useMemo(() => {
    const items = records.flatMap((record) => record.items || []);
    return toChartData(
      countBy(items, (item) => normalizeStatus(item.stockStatus)),
    );
  }, [records]);

  const totalItems = records.reduce(
    (sum, record) => sum + (record.items?.length || 0),
    0,
  );
  const deliveredCount = records.filter(
    (record) => normalizeStatus(record.status).toLowerCase() === "delivered",
  ).length;

  const columns = [
    { title: "WRS No.", dataIndex: "wrsNo", key: "wrsNo" },
    { title: "Aircraft", dataIndex: "aircraft", key: "aircraft" },
    {
      title: "Requested",
      dataIndex: "dateRequested",
      key: "dateRequested",
      render: formatDate,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => <StatusTag status={status} />,
    },
    {
      title: "Items",
      key: "items",
      render: (_, record) => record.items?.length || 0,
    },
  ];

  return (
    <ReportSection
      title="Parts Requisition Report"
      subtitle={`${deliveredCount} delivered requisitions and ${totalItems} requested line items.`}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Requisitions by Month">
            <Segmented
              size="small"
              value={timeframe}
              onChange={setTimeframe}
              options={[
                { label: "Year", value: "yearly" },
                { label: "Month", value: "monthly" },
                { label: "Week", value: "weekly" },
              ]}
              style={{ marginBottom: 12 }}
            />
            <MonthlyBar data={monthlyData} name="Requisitions" />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Requisition Status">
            <StatusPie data={statusData} />
          </Card>
        </Col>
        <Col xs={24}>
          <Card title="Item Stock Status">
            <StatusPie data={itemStatusData} />
          </Card>
        </Col>
        <Col xs={24}>
          <Table
            size={"small"}
            columns={columns}
            dataSource={records.map((record, index) => ({
              ...record,
              key: record._id || index,
            }))}
            loading={loading}
            pagination={{ pageSize: 5 }}
            scroll={{ x: true }}
          />
        </Col>
      </Row>
    </ReportSection>
  );
}
