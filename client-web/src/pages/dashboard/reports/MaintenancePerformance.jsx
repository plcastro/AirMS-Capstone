import React, { useState, useEffect } from "react";
import {
  Row,
  Col,
  Statistic,
  Space,
  Typography,
  Button,
  message,
  Spin,
  Alert,
} from "antd";
import { ExportOutlined } from "@ant-design/icons";
import AreaChartComponent from "../../../components/common/AreaChart";
import { API_BASE } from "../../../utils/API_BASE";

const { Title, Text } = Typography;

export default function MaintenancePerformance() {
  const [stats, setStats] = useState({ completed: 0, dueSoon: 0, overdue: 0 });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currentMonthYear = new Date().toLocaleString("en-PH", {
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    fetchAllTasksAndFilter();
  }, []);

  const fetchAllTasksAndFilter = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token)
        throw new Error("No authentication token found. Please log in.");

      const response = await fetch(`${API_BASE}/api/tasks/getAll`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          throw new Error("Session expired. Please log in again.");
        }
        throw new Error(`Failed to fetch tasks (${response.status})`);
      }

      const result = await response.json();
      const tasks = result.data || [];
      if (!Array.isArray(tasks))
        throw new Error("Invalid data format: expected array");

      // ---- FILTER LOGIC ----
      const now = new Date();
      const threeDaysLater = new Date();
      threeDaysLater.setDate(now.getDate() + 3);

      const completed = tasks.filter((t) => t.status === "Completed").length;
      const dueSoon = tasks.filter(
        (t) =>
          t.status !== "Completed" &&
          t.dueDate &&
          new Date(t.dueDate) >= now &&
          new Date(t.dueDate) <= threeDaysLater,
      ).length;
      const overdue = tasks.filter(
        (t) =>
          t.status !== "Completed" && t.dueDate && new Date(t.dueDate) < now,
      ).length;

      setStats({ completed, dueSoon, overdue });

      // ---- GRAPH DATA ----
      const monthlyMap = tasks.reduce((acc, task) => {
        if (!task.createdAt) return acc;
        const date = new Date(task.createdAt);
        if (isNaN(date.getTime())) return acc;
        const month = date.toLocaleString("default", { month: "short" });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {});

      const monthOrder = [
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
      ];
      const chartArray = Object.entries(monthlyMap)
        .map(([month, value]) => ({ month, value }))
        .sort(
          (a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month),
        );

      setChartData(chartArray);
      setError(null);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message);
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportDocument = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/export/performance`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "performance_report.csv";
      link.click();
      link.remove();
      message.success("Exported successfully");
    } catch {
      message.error("Export failed");
    }
  };

  if (loading) return <Spin size="large" />;
  if (error)
    return <Alert message="Error" description={error} type="error" showIcon />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Chart */}
      <Space orientation="vertical" size={0}>
        <Title level={3} style={{ margin: 0 }}>
          Maintenance Performance
        </Title>
        <Text type="secondary">{currentMonthYear}</Text>
        <AreaChartComponent data={chartData} />
      </Space>
    </div>
  );
}
