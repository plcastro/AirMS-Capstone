import React, { useMemo } from "react";
import { Card, Col, Row, Space, Table, Tag, Typography } from "antd";
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

const STATUS_COLORS = {
  completed: "success",
  delivered: "success",
  approved: "success",
  accepted: "processing",
  released: "processing",
  "pending acceptance": "warning",
  "pending release": "warning",
  pending: "warning",
  "parts requested": "processing",
  "availability checked": "cyan",
  "to be ordered": "gold",
  ordered: "blue",
  cancelled: "error",
  rejected: "error",
};

const normalizeStatus = (value) =>
  String(value || "Unknown")
    .replace(/_/g, " ")
    .trim();

const formatDate = (value) => {
  if (!value) return "---";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "---";
  return date.toLocaleDateString("en-CA");
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

const monthLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleString("en-US", { month: "short" });
};

const StatusTag = ({ status }) => {
  const label = normalizeStatus(status);
  const color = STATUS_COLORS[label.toLowerCase()] || "default";

  return (
    <Tag color={color} style={{ fontWeight: 600, borderRadius: 4 }}>
      {label.toUpperCase()}
    </Tag>
  );
};

const EmptyChart = () => (
  <div style={{ textAlign: "center", padding: 40 }}>
    <Text type="secondary">No data available</Text>
  </div>
);

const StatusPie = ({ data }) => {
  if (!data.length) return <EmptyChart />;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={90}
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
        <Bar dataKey={dataKey} name={name} fill="#26866f" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

const buildMonthlyData = (records) => {
  const counts = countBy(records, (record) => monthLabel(getRecordDate(record)));
  const order = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
    "No date",
  ];

  return Object.entries(counts)
    .map(([month, value]) => ({ month, value }))
    .sort((a, b) => order.indexOf(a.month) - order.indexOf(b.month));
};

const buildAircraftData = (records, getAircraft) =>
  toChartData(countBy(records, getAircraft))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

const ReportSection = ({ title, subtitle, children }) => (
  <Space direction="vertical" size={12} style={{ width: "100%" }}>
    <Space direction="vertical" size={0}>
      <Title level={4} style={{ margin: 0 }}>
        {title}
      </Title>
      {subtitle && <Text type="secondary">{subtitle}</Text>}
    </Space>
    {children}
  </Space>
);

export function FlightLogReport({ records = [], loading = false }) {
  const statusData = useMemo(
    () => toChartData(countBy(records, (record) => normalizeStatus(record.status))),
    [records],
  );
  const monthlyData = useMemo(() => buildMonthlyData(records), [records]);
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
            <MonthlyBar data={aircraftData.map((item) => ({ month: item.name, value: item.value }))} name="Logs" />
          </Card>
        </Col>
        <Col xs={24}>
          <Table
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
  const statusData = useMemo(
    () => toChartData(countBy(records, (record) => normalizeStatus(record.status))),
    [records],
  );
  const monthlyData = useMemo(() => buildMonthlyData(records), [records]);
  const aircraftData = useMemo(
    () => buildAircraftData(records, (record) => record[aircraftLabel] || "Unknown"),
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
            <MonthlyBar data={aircraftData.map((item) => ({ month: item.name, value: item.value }))} name="Inspections" />
          </Card>
        </Col>
        <Col xs={24}>
          <Table
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
  const statusData = useMemo(
    () => toChartData(countBy(records, (record) => normalizeStatus(record.status))),
    [records],
  );
  const monthlyData = useMemo(() => buildMonthlyData(records), [records]);
  const itemStatusData = useMemo(() => {
    const items = records.flatMap((record) => record.items || []);
    return toChartData(countBy(items, (item) => normalizeStatus(item.stockStatus)));
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
