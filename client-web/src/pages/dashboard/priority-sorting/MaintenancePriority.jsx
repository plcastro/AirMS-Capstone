import React, { useState, useEffect } from "react";
import { Table, InputNumber, Row, Col, Card } from "antd";

// Mock data
const mockTasks = [
  {
    id: 1,
    aircraft: "A320-101",
    task: "Engine inspection",
    dueDate: "2026-03-30",
    remainingFlightHours: 8,
    estimatedTurnaround: 5, // hours
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
];

// Default weights (thresholds)
const defaultWeights = {
  urgency: 0.4,
  remainingHours: 0.2,
  turnaround: 0.1,
  safety: 0.3,
};

export default function MaintenancePriority() {
  const [tasks] = useState(mockTasks); //setTasks
  const [weights, setWeights] = useState(defaultWeights);

  const daysUntilDue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    return Math.max(0, (due - today) / (1000 * 60 * 60 * 24));
  };

  useEffect(() => {
    const calculateScore = (task) => {
      const urgencyScore = 1 / (daysUntilDue(task.dueDate) + 1);
      const remainingHoursScore = 1 / (task.remainingFlightHours + 1);
      const turnaroundScore = task.estimatedTurnaround / 24;
      const safetyScore = task.safetyCritical ? 1 : 0;

      return (
        weights.urgency * urgencyScore +
        weights.remainingHours * remainingHoursScore +
        weights.turnaround * turnaroundScore +
        weights.safety * safetyScore
      );
    };

    const tasksWithScore = tasks.map((task) => ({
      ...task,
      priorityScore: calculateScore(task),
    }));
    tasksWithScore.sort((a, b) => b.priorityScore - a.priorityScore);
    setSortedTasks(tasksWithScore);
  }, [tasks, weights]);

  const [sortedTasks, setSortedTasks] = useState([]);

  const columns = [
    {
      title: "Rank",
      key: "rank",
      render: (_, __, index) => index + 1,
    },
    { title: "Aircraft", dataIndex: "aircraft", key: "aircraft" },
    { title: "Task", dataIndex: "task", key: "task" },
    { title: "Due Date", dataIndex: "dueDate", key: "dueDate" },
    {
      title: "Remaining Flight Hours",
      dataIndex: "remainingFlightHours",
      key: "remainingFlightHours",
    },
    {
      title: "Turnaround Time (hrs)",
      dataIndex: "estimatedTurnaround",
      key: "estimatedTurnaround",
    },
    { title: "Status", dataIndex: "status", key: "status" },
    {
      title: "Score",
      dataIndex: "priorityScore",
      key: "priorityScore",
      render: (val) => val.toFixed(2),
    },
  ];

  return (
    <div style={{ padding: 20 }}>
      <Card
        title="Adjust Priority Weights (Thresholds)"
        style={{ marginBottom: 20 }}
      >
        <Row gutter={[16, 16]}>
          {Object.keys(weights).map((key) => (
            <Col xs={24} sm={12} md={6} key={key}>
              <div>{key}</div>
              <InputNumber
                min={0}
                max={1}
                step={0.05}
                value={weights[key]}
                onChange={(val) =>
                  setWeights((prev) => ({ ...prev, [key]: val }))
                }
              />
            </Col>
          ))}
        </Row>
      </Card>

      <Card title="Maintenance Priority Ranking">
        <Table
          columns={columns}
          dataSource={sortedTasks}
          rowKey="id"
          pagination={false}
        />
      </Card>
    </div>
  );
}
