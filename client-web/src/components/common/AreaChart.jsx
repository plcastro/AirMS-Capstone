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

const AreaChartComponent = ({ data }) => {
  return (
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
          stroke="#fb3131"
          fill="#e6f7ff"
          strokeWidth={3}
        />
        <Legend verticalAlign="bottom" align="left" height={10} />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default AreaChartComponent;
