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

const ColorCodedLegend = ({ payload = [] }) => (
  <ul
    style={{
      display: "flex",
      flexWrap: "wrap",
      gap: "8px 16px",
      margin: 0,
      padding: "0 0 8px",
      listStyle: "none",
      fontSize: 12,
      lineHeight: "16px",
    }}
  >
    {payload.map((entry) => (
      <li
        key={`${entry.value}-${entry.color}`}
        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 10,
            height: 10,
            flex: "0 0 10px",
            borderRadius: 2,
            background: entry.color || "#8c8c8c",
          }}
        />
        <span>{entry.value}</span>
      </li>
    ))}
  </ul>
);

export const FailureAnalysisChart = ({ data = [] }) => {
  const rawData = Array.isArray(data) ? data : [];
  // Sort data so the components needing attention appear first.
  const sortedData = [...rawData].sort(
    (a, b) => (b?.failures || 0) - (a?.failures || 0),
  );

  if (sortedData.length === 0) {
    return (
      <div
        style={{
          width: "100%",
          height: 400,
          display: "grid",
          placeItems: "center",
        }}
      >
        No critical component data available
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: 400, minHeight: 400 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={sortedData}
          margin={{ top: 5, right: 30, left: 16, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={true}
            vertical={false}
          />

          <XAxis type="number" allowDecimals={false} />

          <YAxis
            dataKey="name"
            type="category"
            width={140}
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
          <Legend
            verticalAlign="top"
            height={44}
            content={<ColorCodedLegend />}
          />
          <Bar
            dataKey="failures"
            name="Critical Component Count"
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
