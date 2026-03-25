import React from "react";
import { ResponsiveContainer, PieChart, Pie, Tooltip, Legend } from "recharts";

export const SDMChart = () => {
  // Define colors directly in the data objects
  const data = [
    { name: "Aircraft 1", value: 34, fill: "#881fe5" },
    { name: "Aircraft 2", value: 45, fill: "#1890ff" },
    { name: "Aircraft 3", value: 5, fill: "#058b4a" },
    { name: "Aircraft 4", value: 34, fill: "#cebc14" },
    { name: "Aircraft 5", value: 49, fill: "#ffae18" },
    { name: "Aircraft 6", value: 5, fill: "#ac139f" },
  ];

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          //   innerRadius={70}
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
export const ARTChart = () => {
  // Define colors directly in the data objects
  const data = [
    { name: "0 - 10 days", value: 3, fill: "#881fe5" },
    { name: "11 - 20 days", value: 7, fill: "#1890ff" },
    { name: "21 - 30 days", value: 5, fill: "#058b4a" },
    { name: "31 - 40 days", value: 10, fill: "#d78f2b" },
    { name: "More than 40 days", value: 2, fill: "#9b1104" },
  ];

  const fastestTask = data.reduce((prev, curr) =>
    prev.value < curr.value ? prev : curr,
  );

  // Calculate total for percentage
  const totalValue = data.reduce((sum, item) => sum + item.value, 0);
  const fastestPercentage = ((fastestTask.value / totalValue) * 100).toFixed(1);

  return (
    <div>
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={data}
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
