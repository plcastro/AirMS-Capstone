import React, { useContext, useEffect, useState } from "react";
import {
  Row,
  Col,
  Card,
  Input,
  Button,
  Select,
  Statistic,
  message,
  Typography,
} from "antd";
import { SearchOutlined, ExportOutlined } from "@ant-design/icons";

import MaintenancePerformance from "./MaintenancePerformance";
import MaintenanceSummary from "./MaintenanceSummary";
import MaintenanceHistory from "./MaintenanceHistory";
import ComponentUsage from "./ComponentUsage";
import { AuthContext } from "../../../context/AuthContext";
import {
  exportToExcel,
  exportToPDF,
} from "../../../components/common/ExportFile";
import { API_BASE } from "../../../utils/API_BASE";
const { Title, Text } = Typography;

export default function MaintenanceDashboard() {
  const { getValidToken } = useContext(AuthContext);
  const [searchText, setSearchText] = useState("");
  const [selectedFileType, setSelectedFileType] = useState("PDF");
  const [fileTypeOptions] = useState(["PDF", "Excel"]);
  const [tasks, setTasks] = useState([]);
  const [partsRecords, setPartsRecords] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [stats, setStats] = useState({ completed: 0, dueSoon: 0, overdue: 0 });

  const isCompletedTask = (task = {}) => {
    const status = String(task.status || "")
      .trim()
      .toLowerCase();
    return (
      ["completed", "turned in", "approved"].includes(status) ||
      task.isApproved === true ||
      Boolean(task.completedAt)
    );
  };

  const getTaskDueDate = (task = {}) => {
    const value = task.dueDate || task.endDateTime || task.dateRectified;
    if (!value) return null;

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoadingTasks(true);

        const token = await getValidToken();
        if (!token) {
          throw new Error("No authentication token found. Please log in.");
        }

        const response = await fetch(`${API_BASE}/api/tasks/getAll`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const partsResponse = await fetch(
          `${API_BASE}/api/parts-monitoring?page=1&limit=1000`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem("token");
            throw new Error("Session expired. Please log in again.");
          }
          throw new Error(`Failed to fetch tasks (${response.status})`);
        }
        if (!partsResponse.ok) {
          throw new Error(
            `Failed to fetch parts monitoring (${partsResponse.status})`,
          );
        }

        const result = await response.json();
        const partsResult = await partsResponse.json();
        const taskData = Array.isArray(result.data) ? result.data : [];
        const partsData = Array.isArray(partsResult.data)
          ? partsResult.data
          : [];
        setTasks(taskData);
        setPartsRecords(partsData);

        const now = new Date();
        const threeDaysLater = new Date();
        threeDaysLater.setDate(now.getDate() + 3);

        const completed = taskData.filter((task) =>
          isCompletedTask(task),
        ).length;
        const dueSoon = taskData.filter((task) => {
          if (isCompletedTask(task)) return false;
          const dueDate = getTaskDueDate(task);
          return dueDate && dueDate >= now && dueDate <= threeDaysLater;
        }).length;
        const overdue = taskData.filter((task) => {
          if (isCompletedTask(task)) return false;
          const dueDate = getTaskDueDate(task);
          return dueDate && dueDate < now;
        }).length;

        setStats({ completed, dueSoon, overdue });
      } catch (err) {
        console.error("Failed to fetch tasks", err);
        message.error(err.message || "Failed to fetch maintenance tasks");
      } finally {
        setLoadingTasks(false);
      }
    };

    fetchTasks();
  }, [getValidToken]);

  const cards = [
    {
      key: "performance",
      title: "Performance Overview",
      component: <MaintenancePerformance tasks={tasks} />,
      keywords: ["performance", "overview"],
    },
    {
      key: "history",
      title: "Maintenance History",
      component: <MaintenanceHistory tasks={tasks} loading={loadingTasks} />,
      keywords: ["history", "maintenance", "record"],
    },
    {
      key: "summary",
      title: "Maintenance Insights",
      component: <MaintenanceSummary tasks={tasks} loading={loadingTasks} />,
      keywords: ["summary", "insights", "repair"],
    },
    {
      key: "component",
      title: "Component Analysis",
      component: (
        <ComponentUsage records={partsRecords} loading={loadingTasks} />
      ),
      keywords: ["component", "usage", "analysis"],
    },
  ];

  const filteredCards = cards
    .map((card) => ({
      ...card,
      relevance: card.keywords.some((kw) =>
        kw.toLowerCase().includes(searchText.toLowerCase()),
      )
        ? 1
        : 0,
    }))
    .sort((a, b) => b.relevance - a.relevance)
    .filter((card) => searchText === "" || card.relevance > 0);

  return (
    <div
      style={{
        padding: 20,
        minHeight: "100vh",
        overflowY: "scroll",
        height: "100%",
      }}
    >
      <Card style={{ marginBottom: 10 }}>
        <Title level={3}>Maintenance Reports and Analytics</Title>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={24} md={12} lg={10}>
            <Input
              size="large"
              placeholder="Search..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>

          <Col xs={12} sm={8} md={6} lg={5}>
            <Select
              value={selectedFileType}
              onChange={setSelectedFileType}
              size="large"
              style={{ width: "100%" }}
              options={fileTypeOptions.map((type) => ({
                label: type,
                value: type,
              }))}
            />
          </Col>

          <Col xs={12} sm={8} md={6} lg={4}>
            <Button
              type="primary"
              icon={<ExportOutlined />}
              block
              onClick={() => {
                if (selectedFileType === "PDF") exportToPDF();
                else exportToExcel();
              }}
            >
              Export
            </Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Completed Tasks"
              value={stats.completed}
              styles={{ content: { color: "#048a25" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Due Soon (next 3 days)"
              value={stats.dueSoon}
              styles={{ content: { color: "#faad14" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Overdue Tasks"
              value={stats.overdue}
              styles={{ content: { color: "#cf1322" } }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 100 }}>
        {filteredCards.map((card) => (
          <Col xs={24} key={card.key}>
            <Card title={card.title}>{card.component}</Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
