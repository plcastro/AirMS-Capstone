import React, { useMemo } from "react";
import { Card, Col, Row, Statistic, Table, Tag } from "antd";

const countCompletedLike = (records = [], statusKeys = ["status"]) =>
  records.filter((record) => {
    const text = statusKeys
      .map((key) => String(record?.[key] || ""))
      .join(" ")
      .toLowerCase();
    return ["completed", "approved", "released", "accepted", "done"].some((k) =>
      text.includes(k),
    );
  }).length;

export default function GeneralReports({
  tasks = [],
  flightLogs = [],
  preInspections = [],
  postInspections = [],
  partsRequisitions = [],
  loading = false,
}) {
  const summary = useMemo(() => {
    const total = {
      tasks: tasks.length,
      flightLogs: flightLogs.length,
      preInspections: preInspections.length,
      postInspections: postInspections.length,
      requisitions: partsRequisitions.length,
    };

    const completed = {
      tasks: countCompletedLike(tasks),
      flightLogs: countCompletedLike(flightLogs),
      preInspections: countCompletedLike(preInspections),
      postInspections: countCompletedLike(postInspections),
      requisitions: countCompletedLike(partsRequisitions),
    };

    return { total, completed };
  }, [tasks, flightLogs, preInspections, postInspections, partsRequisitions]);

  const rows = [
    {
      key: "tasks",
      module: "Task Assignment",
      total: summary.total.tasks,
      completed: summary.completed.tasks,
    },
    {
      key: "flight",
      module: "Flight Log",
      total: summary.total.flightLogs,
      completed: summary.completed.flightLogs,
    },
    {
      key: "pre",
      module: "Pre-Inspection",
      total: summary.total.preInspections,
      completed: summary.completed.preInspections,
    },
    {
      key: "post",
      module: "Post-Inspection",
      total: summary.total.postInspections,
      completed: summary.completed.postInspections,
    },
    {
      key: "req",
      module: "Parts Requisition",
      total: summary.total.requisitions,
      completed: summary.completed.requisitions,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} lg={8}>
          <Card size="small">
            <Statistic title="All Records" value={rows.reduce((s, r) => s + r.total, 0)} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card size="small">
            <Statistic
              title="Completed / Closed"
              value={rows.reduce((s, r) => s + r.completed, 0)}
              styles={{ content: { color: "#26866f" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card size="small">
            <Statistic
              title="Open / Pending"
              value={rows.reduce((s, r) => s + (r.total - r.completed), 0)}
              styles={{ content: { color: "#d46b08" } }}
            />
          </Card>
        </Col>
      </Row>

      <Table
        size="small"
        loading={loading}
        pagination={false}
        dataSource={rows}
        columns={[
          { title: "Module", dataIndex: "module", key: "module" },
          { title: "Total", dataIndex: "total", key: "total", width: 100 },
          {
            title: "Completed / Closed",
            dataIndex: "completed",
            key: "completed",
            width: 160,
          },
          {
            title: "Completion",
            key: "completion",
            width: 140,
            render: (_, row) => {
              const pct =
                row.total > 0 ? Math.round((row.completed / row.total) * 100) : 0;
              const color = pct >= 70 ? "green" : pct >= 40 ? "gold" : "red";
              return <Tag color={color}>{pct}%</Tag>;
            },
          },
        ]}
      />
    </div>
  );
}
