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
    status: "Pending",
  },
  {
    id: 2,
    aircraft: "B737-202",
    task: "Hydraulic system check",
    dueDate: "2026-04-02",
    remainingFlightHours: 15,
    estimatedTurnaround: 2,
    safetyCritical: false,
    status: "Pending",
  },
  {
    id: 3,
    aircraft: "A320-102",
    task: "Landing gear lubrication",
    dueDate: "2026-03-29",
    remainingFlightHours: 5,
    estimatedTurnaround: 1,
    safetyCritical: true,
    status: "Pending",
  },
  {
    id: 4,
    aircraft: "B429-301",
    task: "Avionics troubleshooting",
    dueDate: "2026-04-08",
    remainingFlightHours: 4,
    estimatedTurnaround: 6,
    safetyCritical: true,
    status: "Pending",
  },
  {
    id: 5,
    aircraft: "H125-118",
    task: "Cabin interior inspection",
    dueDate: "2026-04-14",
    remainingFlightHours: 20,
    estimatedTurnaround: 2,
    safetyCritical: false,
    status: "Pending",
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

  if (task.estimatedTurnaround >= rules.longTurnaroundHours) {
    tieBreakerScore += 3;
  }

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

  const prioritizedTasks = useMemo(() => {
    return mockTasks
      .map((task) => evaluatePriority(task, rules))
      .sort((firstTask, secondTask) => {
        if (firstTask.priorityRank !== secondTask.priorityRank) {
          return firstTask.priorityRank - secondTask.priorityRank;
        }

        if (firstTask.tieBreakerScore !== secondTask.tieBreakerScore) {
          return secondTask.tieBreakerScore - firstTask.tieBreakerScore;
        }

        if (firstTask.daysUntilDue !== secondTask.daysUntilDue) {
          return firstTask.daysUntilDue - secondTask.daysUntilDue;
        }

        return firstTask.remainingFlightHours - secondTask.remainingFlightHours;
      });
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
      width: 110,
      render: (value) =>
        value < 0 ? `${Math.abs(value)} day/s overdue` : value,
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
      render: (value) => `${value} hrs`,
    },
    {
      title: "Priority",
      dataIndex: "priorityLevel",
      key: "priorityLevel",
      width: 110,
      render: (value) => (
        <Tag color={PRIORITY_CONFIG[value].color} style={{ fontWeight: 600 }}>
          {value}
        </Tag>
      ),
    },
    {
      title: "Rule Trigger",
      dataIndex: "reasons",
      key: "reasons",
      render: (reasons) => (
        <List
          size="small"
          dataSource={reasons}
          renderItem={(reason) => <List.Item>{reason}</List.Item>}
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
      }}
    >
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col span={24}>
          <Card>
            <Title level={4} style={{ marginTop: 0 }}>
              Adjustable Rule-Based Maintenance Ranking
            </Title>
            <Text>
              The Maintenance Manager can tune the rule thresholds below to
              control how aggressively the system escalates schedules. The
              ranking still follows fixed operational rules, but the trigger
              points are now adjustable.
            </Text>
          </Card>
        </Col>
        <Col span={24}>
          <Card title="Maintenance Manager Rule Controls">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8}>
                <Text>Critical if due within</Text>
                <InputNumber
                  min={0}
                  value={rules.criticalDueDays}
                  onChange={(value) =>
                    setRules((prev) => ({
                      ...prev,
                      criticalDueDays: value ?? prev.criticalDueDays,
                    }))
                  }
                  style={{ width: "100%" }}
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Text>Critical if remaining hours are at most</Text>
                <InputNumber
                  min={0}
                  value={rules.criticalRemainingHours}
                  onChange={(value) =>
                    setRules((prev) => ({
                      ...prev,
                      criticalRemainingHours:
                        value ?? prev.criticalRemainingHours,
                    }))
                  }
                  style={{ width: "100%" }}
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Text>High if due within</Text>
                <InputNumber
                  min={0}
                  value={rules.highDueDays}
                  onChange={(value) =>
                    setRules((prev) => ({
                      ...prev,
                      highDueDays: value ?? prev.highDueDays,
                    }))
                  }
                  style={{ width: "100%" }}
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Text>High if remaining hours are at most</Text>
                <InputNumber
                  min={0}
                  value={rules.highRemainingHours}
                  onChange={(value) =>
                    setRules((prev) => ({
                      ...prev,
                      highRemainingHours: value ?? prev.highRemainingHours,
                    }))
                  }
                  style={{ width: "100%" }}
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Text>Medium if due within</Text>
                <InputNumber
                  min={0}
                  value={rules.mediumDueDays}
                  onChange={(value) =>
                    setRules((prev) => ({
                      ...prev,
                      mediumDueDays: value ?? prev.mediumDueDays,
                    }))
                  }
                  style={{ width: "100%" }}
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Text>Long turnaround threshold</Text>
                <InputNumber
                  min={1}
                  value={rules.longTurnaroundHours}
                  onChange={(value) =>
                    setRules((prev) => ({
                      ...prev,
                      longTurnaroundHours: value ?? prev.longTurnaroundHours,
                    }))
                  }
                  style={{ width: "100%" }}
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Space direction="vertical">
                  <Text>Safety-critical auto escalation</Text>
                  <Switch
                    checked={rules.safetyBoostEnabled}
                    onChange={(checked) =>
                      setRules((prev) => ({
                        ...prev,
                        safetyBoostEnabled: checked,
                      }))
                    }
                  />
                </Space>
              </Col>
              <Col xs={24}>
                <Button onClick={() => setRules(defaultRules)}>
                  Reset Rules
                </Button>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={prioritizedTasks}
        rowKey="id"
        pagination={false}
        scroll={{ x: 1100 }}
      />
    </div>
  );
}
