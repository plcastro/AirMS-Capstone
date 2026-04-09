import React, { useMemo, useState } from "react";
import {
  Table,
  Row,
  Col,
  Card,
  Typography,
  Tag,
  List,
  InputNumber,
  Switch,
  Space,
  Button,
} from "antd";

const { Title, Text } = Typography;

const mockTasks = [
  {
    id: 1,
    aircraft: "A320-101",
    task: "Engine inspection",
    dueDate: "2026-03-30",
    remainingFlightHours: 8,
    estimatedTurnaround: 5,
    safetyCritical: true,
  },
  {
    id: 2,
    aircraft: "B737-202",
    task: "Hydraulic system check",
    dueDate: "2026-04-02",
    remainingFlightHours: 15,
    estimatedTurnaround: 2,
    safetyCritical: false,
  },
  {
    id: 3,
    aircraft: "A320-102",
    task: "Landing gear lubrication",
    dueDate: "2026-03-29",
    remainingFlightHours: 5,
    estimatedTurnaround: 1,
    safetyCritical: true,
  },
  {
    id: 4,
    aircraft: "B429-301",
    task: "Avionics troubleshooting",
    dueDate: "2026-04-08",
    remainingFlightHours: 4,
    estimatedTurnaround: 6,
    safetyCritical: true,
  },
  {
    id: 5,
    aircraft: "H125-118",
    task: "Cabin interior inspection",
    dueDate: "2026-04-14",
    remainingFlightHours: 20,
    estimatedTurnaround: 2,
    safetyCritical: false,
  },
];

const PRIORITY_CONFIG = {
  Critical: { rank: 1, color: "red" },
  High: { rank: 2, color: "volcano" },
  Medium: { rank: 3, color: "gold" },
  Low: { rank: 4, color: "green" },
};

const defaultRules = {
  criticalDueDays: 1,
  criticalRemainingHours: 5,
  highDueDays: 3,
  highRemainingHours: 10,
  mediumDueDays: 7,
  longTurnaroundHours: 5,
  safetyBoostEnabled: true,
};

const getDaysUntilDue = (dueDate) => {
  const today = new Date();
  const due = new Date(dueDate);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
};

const evaluatePriority = (task, rules) => {
  const daysUntilDue = getDaysUntilDue(task.dueDate);
  const reasons = [];
  let priority = "Low";
  let tieBreakerScore = 0;

  if (daysUntilDue < 0) {
    priority = "Critical";
    reasons.push("Overdue maintenance schedule");
    tieBreakerScore += 100;
  } else if (daysUntilDue <= rules.criticalDueDays && task.safetyCritical) {
    priority = "Critical";
    reasons.push(
      `Due within ${rules.criticalDueDays} day/s and safety-critical`,
    );
    tieBreakerScore += 95;
  } else if (
    task.remainingFlightHours <= rules.criticalRemainingHours &&
    task.safetyCritical
  ) {
    priority = "Critical";
    reasons.push(
      `Remaining flight hours at or below ${rules.criticalRemainingHours} on a safety-critical task`,
    );
    tieBreakerScore += 92;
  } else if (daysUntilDue <= rules.highDueDays) {
    priority = "High";
    reasons.push(`Due within ${rules.highDueDays} day/s`);
    tieBreakerScore += 75;
  } else if (task.remainingFlightHours <= rules.highRemainingHours) {
    priority = "High";
    reasons.push(
      `Remaining flight hours at or below ${rules.highRemainingHours}`,
    );
    tieBreakerScore += 70;
  } else if (task.safetyCritical && rules.safetyBoostEnabled) {
    priority = "High";
    reasons.push("Safety-critical maintenance requirement");
    tieBreakerScore += 68;
  } else if (daysUntilDue <= rules.mediumDueDays) {
    priority = "Medium";
    reasons.push(`Due within ${rules.mediumDueDays} day/s`);
    tieBreakerScore += 50;
  } else if (task.estimatedTurnaround >= rules.longTurnaroundHours) {
    priority = "Medium";
    reasons.push("Long turnaround time requires earlier scheduling");
    tieBreakerScore += 45;
  } else {
    reasons.push("No urgent maintenance rule triggered");
    tieBreakerScore += 20;
  }

  if (
    task.safetyCritical &&
    rules.safetyBoostEnabled &&
    !reasons.includes("Safety-critical maintenance requirement")
  ) {
    reasons.push("Safety impact increases review urgency");
    tieBreakerScore += 5;
  }
  if (task.estimatedTurnaround >= rules.longTurnaroundHours)
    tieBreakerScore += 3;

  return {
    ...task,
    daysUntilDue,
    priorityLevel: priority,
    priorityRank: PRIORITY_CONFIG[priority].rank,
    tieBreakerScore,
    reasons,
  };
};

export default function MaintenancePriority() {
  const [rules, setRules] = useState(defaultRules);
  const [showControls, setShowControls] = useState(false);

  const prioritizedTasks = useMemo(() => {
    return mockTasks
      .map((task) => evaluatePriority(task, rules))
      .sort((a, b) =>
        a.priorityRank !== b.priorityRank
          ? a.priorityRank - b.priorityRank
          : b.tieBreakerScore - a.tieBreakerScore,
      );
  }, [rules]);

  const columns = [
    {
      title: "Rank",
      key: "rank",
      width: 70,
      render: (_, __, index) => index + 1,
    },
    { title: "Aircraft", dataIndex: "aircraft", key: "aircraft", width: 130 },
    { title: "Task", dataIndex: "task", key: "task" },
    { title: "Due Date", dataIndex: "dueDate", key: "dueDate", width: 120 },
    {
      title: "Days To Due",
      dataIndex: "daysUntilDue",
      key: "daysUntilDue",
      width: 120,
      render: (v) =>
        v < 0 ? <Text type="danger">{Math.abs(v)} days overdue</Text> : v,
    },
    {
      title: "Remaining Hrs",
      dataIndex: "remainingFlightHours",
      key: "remainingFlightHours",
      width: 120,
    },
    {
      title: "Turnaround",
      dataIndex: "estimatedTurnaround",
      key: "estimatedTurnaround",
      width: 110,
      render: (v) => `${v} hrs`,
    },
    {
      title: "Priority",
      dataIndex: "priorityLevel",
      key: "priorityLevel",
      width: 110,
      render: (v) => (
        <Tag color={PRIORITY_CONFIG[v].color} style={{ fontWeight: 700 }}>
          {v}
        </Tag>
      ),
    },
    {
      title: "Rule Trigger",
      dataIndex: "reasons",
      key: "reasons",
      render: (r) => (
        <List
          size="small"
          dataSource={r}
          renderItem={(i) => <List.Item style={{ padding: 0 }}>{i}</List.Item>}
        />
      ),
    },
  ];

  return (
    <div
      style={{
        padding: 20,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        paddingBottom: 120,
        gap: 10,
      }}
    >
      <Card>
        <Title level={4}>Adjustable Rule-Based Maintenance Ranking</Title>
        <Text type="secondary">
          Adjust rule thresholds to control schedule escalation. Click the
          button below to show/hide controls.
        </Text>
        <div style={{ marginTop: 12 }}>
          <Button onClick={() => setShowControls(!showControls)}>
            {showControls ? "Hide Controls" : "Show Controls"}
          </Button>
        </div>
      </Card>

      {showControls && (
        <Card title="Maintenance Manager Rule Controls">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Text>Critical if due within (days)</Text>
              <InputNumber
                min={0}
                value={rules.criticalDueDays}
                onChange={(v) =>
                  setRules((p) => ({
                    ...p,
                    criticalDueDays: v ?? p.criticalDueDays,
                  }))
                }
                style={{ width: "100%" }}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Text>Critical remaining hours</Text>
              <InputNumber
                min={0}
                value={rules.criticalRemainingHours}
                onChange={(v) =>
                  setRules((p) => ({
                    ...p,
                    criticalRemainingHours: v ?? p.criticalRemainingHours,
                  }))
                }
                style={{ width: "100%" }}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Text>High if due within (days)</Text>
              <InputNumber
                min={0}
                value={rules.highDueDays}
                onChange={(v) =>
                  setRules((p) => ({ ...p, highDueDays: v ?? p.highDueDays }))
                }
                style={{ width: "100%" }}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Text>High remaining hours</Text>
              <InputNumber
                min={0}
                value={rules.highRemainingHours}
                onChange={(v) =>
                  setRules((p) => ({
                    ...p,
                    highRemainingHours: v ?? p.highRemainingHours,
                  }))
                }
                style={{ width: "100%" }}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Text>Medium if due within (days)</Text>
              <InputNumber
                min={0}
                value={rules.mediumDueDays}
                onChange={(v) =>
                  setRules((p) => ({
                    ...p,
                    mediumDueDays: v ?? p.mediumDueDays,
                  }))
                }
                style={{ width: "100%" }}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Text>Long turnaround threshold (hrs)</Text>
              <InputNumber
                min={1}
                value={rules.longTurnaroundHours}
                onChange={(v) =>
                  setRules((p) => ({
                    ...p,
                    longTurnaroundHours: v ?? p.longTurnaroundHours,
                  }))
                }
                style={{ width: "100%" }}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Space orientation="vertical">
                <Text>Safety-critical auto escalation</Text>
                <Switch
                  checked={rules.safetyBoostEnabled}
                  onChange={(v) =>
                    setRules((p) => ({ ...p, safetyBoostEnabled: v }))
                  }
                />
              </Space>
            </Col>
            <Col xs={24}>
              <Button type="primary" onClick={() => setRules(defaultRules)}>
                Reset Rules
              </Button>
            </Col>
          </Row>
        </Card>
      )}

      <Table
        columns={columns}
        dataSource={prioritizedTasks}
        rowKey="id"
        pagination={false}
        scroll={{ x: 1200 }}
        bordered
        sticky
      />
    </div>
  );
}
