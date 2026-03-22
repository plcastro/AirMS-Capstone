import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

const AreaChartComponent = () => {
  // Mapping data to maintenance context
  const data = [
    { month: "Jan", completed: 12, "due soon": 5, scheduled: 20, overdue: 3 },
    { month: "Feb", completed: 19, "due soon": 8, scheduled: 25, overdue: 2 },
    { month: "Mar", completed: 15, "due soon": 12, scheduled: 22, overdue: 18 },
    { month: "Apr", completed: 22, "due soon": 10, scheduled: 30, overdue: 27 },
    { month: "May", completed: 30, "due soon": 15, scheduled: 35, overdue: 2 },
    { month: "Jun", completed: 10, "due soon": 2, scheduled: 15, overdue: 5 },
    { month: "Jul", completed: 8, "due soon": 1, scheduled: 10, overdue: 10 },
    { month: "Apr", completed: 22, "due soon": 10, scheduled: 30, overdue: 27 },
    { month: "Aug", completed: 30, "due soon": 15, scheduled: 35, overdue: 2 },
    { month: "Sept", completed: 10, "due soon": 2, scheduled: 15, overdue: 5 },
    { month: "Oct", completed: 8, "due soon": 1, scheduled: 10, overdue: 10 },
    { month: "Aug", completed: 30, "due soon": 15, scheduled: 35, overdue: 2 },
    { month: "Nov", completed: 10, "due soon": 2, scheduled: 15, overdue: 5 },
    { month: "Dec", completed: 8, "due soon": 1, scheduled: 10, overdue: 10 },
  ];

  return (
    // Height 300-400px is usually best for dashcards
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="#f0f0f0"
        />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#8c8c8c", fontSize: 12 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#8c8c8c", fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        />

        <Area
          type="monotone"
          dataKey="completed"
          stackId="1"
          stroke="#52c41a"
          fill="#f6ffed"
          strokeWidth={3}
        />

        <Area
          type="monotone"
          dataKey="due soon"
          stackId="1"
          stroke="#6828d7"
          fill="#e6f7ff"
          strokeWidth={3}
        />
        <Area
          type="monotone"
          dataKey="overdue"
          stackId="1"
          stroke="#d42828"
          fill="#e6f7ff"
          strokeWidth={3}
        />
        <Legend verticalAlign="top" height={50} />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default AreaChartComponent;
