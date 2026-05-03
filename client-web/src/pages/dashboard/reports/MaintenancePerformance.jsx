import React, { useEffect, useState } from "react";
import { Segmented, Space, Typography, message } from "antd";
import AreaChartComponent from "../../../components/common/AreaChart";

const { Title, Text } = Typography;

export default function MaintenancePerformance({ tasks = [] }) {
  const [chartData, setChartData] = useState([]);
  const [groupBy, setGroupBy] = useState("month");

  const currentMonthYear = new Date().toLocaleString("en-PH", {
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    try {
      const isCompletedTask = (task = {}) => {
        const status = String(task.status || "").trim().toLowerCase();
        return status === "approved" || task.isApproved === true;
      };

      const getTaskDueDate = (task = {}) => {
        const value = task.endDateTime || task.dueDate || task.dateRectified;
        if (!value) return null;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
      };

      const getBucketLabel = (date) => {
        if (groupBy === "week") {
          const weekStart = new Date(date);
          weekStart.setHours(0, 0, 0, 0);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          return weekStart.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
        }

        return date.toLocaleString("default", { month: "short" });
      };

      const getBucketOrder = (date) => {
        if (groupBy === "week") {
          const weekStart = new Date(date);
          weekStart.setHours(0, 0, 0, 0);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          return weekStart.getTime();
        }

        return date.getMonth();
      };

      const periodMap = tasks.reduce((acc, task) => {
        const status = String(task.status || "").trim().toLowerCase();
        const dueDate = getTaskDueDate(task);
        const approved = isCompletedTask(task);
        const now = new Date();
        const pending =
          !approved &&
          !["completed", "turned in", "closed"].includes(status) &&
          (!dueDate || dueDate >= now);
        const overdue = !approved && dueDate && dueDate < now;

        const bucketSource =
          approved
            ? task.approvedAt || task.completedAt || task.updatedAt || dueDate
            : dueDate || task.updatedAt || task.createdAt;
        if (!bucketSource) return acc;

        const date = new Date(bucketSource);
        if (isNaN(date.getTime())) return acc;

        const label = getBucketLabel(date);
        if (!acc[label]) {
          acc[label] = {
            period: label,
            order: getBucketOrder(date),
            completed: 0,
            pending: 0,
            overdue: 0,
          };
        }

        if (approved) acc[label].completed += 1;
        else if (overdue) acc[label].overdue += 1;
        else if (pending) acc[label].pending += 1;
        return acc;
      }, {});

      const chartArray = Object.values(periodMap).sort(
        (a, b) => a.order - b.order,
      );

      setChartData(chartArray);
    } catch (err) {
      console.error("Chart mapping error:", err);
      message.error("Failed to prepare maintenance performance chart");
    }
  }, [tasks, groupBy]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Space direction="vertical" size={8} style={{ width: "100%" }}>
        <Space style={{ justifyContent: "space-between", width: "100%" }}>
          <Space direction="vertical" size={0}>
            <Title level={3} style={{ margin: 0 }}>
              Maintenance Performance
            </Title>
            <Text type="secondary">{currentMonthYear}</Text>
          </Space>
          <Segmented
            value={groupBy}
            onChange={setGroupBy}
            options={[
              { label: "Week", value: "week" },
              { label: "Month", value: "month" },
            ]}
          />
        </Space>
        <AreaChartComponent
          data={chartData}
          xKey="period"
          series={[
            { key: "completed", name: "Completed (Approved)", color: "#26866f" },
            { key: "pending", name: "Pending", color: "#faad14" },
            { key: "overdue", name: "Overdue", color: "#cf1322" },
          ]}
        />
      </Space>
    </div>
  );
}
