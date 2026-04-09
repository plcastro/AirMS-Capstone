import React from "react";
import { ResponsiveContainer, PieChart, Pie, Tooltip, Legend } from "recharts";

const EMPTY_DATA = [{ name: "No data", value: 1, fill: "#d9d9d9" }];

export const SDMChart = ({ data = [] }) => {
  const chartData = data.length > 0 ? data : EMPTY_DATA;

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          outerRadius={100}
          paddingAngle={0}
          dataKey="value"
          stroke="none"
        />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        />
        <Legend verticalAlign="bottom" height={36} />
      </PieChart>
    </ResponsiveContainer>
  );
};

export const ARTChart = ({ data = [] }) => {
  const chartData = data.length > 0 ? data : EMPTY_DATA;

  const fastestTask = chartData.reduce((prev, curr) =>
    prev.value < curr.value ? prev : curr,
  );

  const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);
  const fastestPercentage = ((fastestTask.value / totalValue) * 100).toFixed(1);

  return (
    <div>
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={0}
            dataKey="value"
            stroke="none"
          />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            color: fastestTask.fill,
          }}
        >
          {fastestPercentage}%
        </span>
        <br />
        <span style={{ fontSize: "12px", color: "#8c8c8c" }}>Fastest Task</span>
      </div>
    </div>
  );
};
