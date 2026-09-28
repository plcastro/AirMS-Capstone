import React from "react";
import { ResponsiveContainer, PieChart, Pie, Tooltip, Legend } from "recharts";

const EMPTY_DATA = [{ name: "No data", value: 1, fill: "#d9d9d9" }];

const ColorCodedLegend = ({ payload = [] }) => (
  <ul
    style={{
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: "8px 14px",
      margin: 0,
      padding: "10px 6px 0",
      listStyle: "none",
      fontSize: 12,
      lineHeight: "16px",
    }}
  >
    {payload.map((entry) => {
      const color = entry.color || entry.payload?.fill || "#8c8c8c";
      const label = entry.value || entry.payload?.name || "Item";

      return (
        <li
          key={`${label}-${color}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            maxWidth: 150,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 10,
              height: 10,
              flex: "0 0 10px",
              borderRadius: 2,
              background: color,
            }}
          />
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={String(label)}
          >
            {label}
          </span>
        </li>
      );
    })}
  </ul>
);

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
          cy="42%"
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
          height={50}
          content={<ColorCodedLegend />}
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
            height={86}
            content={<ColorCodedLegend />}
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
