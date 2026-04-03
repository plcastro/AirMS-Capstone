import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AnalysisChartMockData } from "./MockData";

export const FailureAnalysisChart = () => {
  const rawData = AnalysisChartMockData;
  // Sort data so the most "failure prone" (highest failure count) is at the top
  const sortedData = [...rawData].sort((a, b) => b.failures - a.failures);

  return (
    <div style={{ width: "100%", height: 400 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={sortedData}
          margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={true}
            vertical={false}
          />

          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />

          <YAxis
            dataKey="name"
            type="category"
            width={100}
            style={{ fontSize: "12px", fontWeight: "bold" }}
          />

          <Tooltip
            cursor={{ fill: "#f5f5f5" }}
            contentStyle={{
              borderRadius: "8px",
              border: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          />
          <Legend verticalAlign="top" height={36} />
          <Bar
            dataKey="failures"
            name="Reported Failures"
            fill="#ff4d4f"
            radius={[0, 4, 4, 0]}
            barSize={20}
          />

          {/* <Bar
            dataKey="maintenanceHours"
            name="Maint. Hours"
            fill="#1890ff"
            radius={[0, 4, 4, 0]}
            barSize={10}
          /> */}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
