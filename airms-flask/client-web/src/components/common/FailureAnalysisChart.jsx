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
          <Legend verticalAlign="top" height={36} />
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
