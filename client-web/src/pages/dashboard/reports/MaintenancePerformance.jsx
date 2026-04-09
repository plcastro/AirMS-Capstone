import React, { useEffect, useState } from "react";
import { Space, Typography, message } from "antd";
import AreaChartComponent from "../../../components/common/AreaChart";

const { Title, Text } = Typography;

export default function MaintenancePerformance({ tasks = [] }) {
  const [chartData, setChartData] = useState([]);

  const currentMonthYear = new Date().toLocaleString("en-PH", {
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    try {
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
    } catch (err) {
      console.error("Chart mapping error:", err);
      message.error("Failed to prepare maintenance performance chart");
    }
  }, [tasks]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
