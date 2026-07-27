import React from "react";
import { ResponsiveContainer, PieChart, Pie, Tooltip, Legend } from "recharts";

const EMPTY_DATA = [{ name: "No data", value: 1, fill: "#d9d9d9" }];

export const SDMChart = ({
  data = [],
  height = 350,
  outerRadius = 80,
  onSliceClick,
}) => {
  const chartData = data.length > 0 ? data : EMPTY_DATA;

  return (
    <ResponsiveContainer
      width="100%"
      height={height}
      minWidth={0}
      minHeight={220}
    >
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="55%"
          outerRadius={outerRadius}
          paddingAngle={0}
          dataKey="value"
          stroke="none"
          onClick={onSliceClick}
          cursor={onSliceClick ? "pointer" : "default"}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        />
        <Legend
          verticalAlign="bottom"
          align="center"
          height={72}
          wrapperStyle={{
            fontSize: 12,
            lineHeight: "18px",
            paddingTop: 12,
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export const ARTChart = ({
  data = [],
  onSliceClick,
  centerValue = "0.0h",
  centerLabel = "Avg. Rectification",
}) => {
  const chartData = data.length > 0 ? data : EMPTY_DATA;

  return (
    <div style={{ position: "relative", minHeight: 350 }}>
      <ResponsiveContainer
        width="100%"
        height={350}
        minWidth={0}
        minHeight={280}
      >
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="55%"
            innerRadius={60}
            outerRadius={70}
            paddingAngle={0}
            dataKey="value"
            stroke="none"
            onClick={onSliceClick}
            cursor={onSliceClick ? "pointer" : "default"}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          />
          <Legend
            verticalAlign="bottom"
            align="center"
            height={72}
            wrapperStyle={{
              fontSize: 12,
              lineHeight: "18px",
              paddingTop: 8,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div
        style={{
          position: "absolute",
          top: "45%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
          pointerEvents: "none",
          width: "60%",
        }}
      >
        <span
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            color: "#26866f",
            lineHeight: 1.1,
            wordBreak: "break-word",
          }}
        >
          {centerValue}
        </span>
        <br />
        <span
          style={{
            fontSize: "12px",
            color: "#8c8c8c",
            lineHeight: 1.2,
            whiteSpace: "normal",
          }}
        >
          {centerLabel}
        </span>
      </div>
    </div>
  );
};
