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

const DEFAULT_SERIES = [{ key: "value", color: "#26866f", name: "Value" }];

const ColorCodedLegend = ({ payload = [] }) => (
  <ul
    style={{
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: "8px 16px",
      margin: 0,
      padding: "12px 6px 0",
      listStyle: "none",
      fontSize: 12,
      lineHeight: "16px",
    }}
  >
    {payload.map((entry) => (
      <li
        key={`${entry.value}-${entry.color}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          maxWidth: 190,
        }}
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
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={String(entry.value || "")}
        >
          {entry.value}
        </span>
      </li>
    ))}
  </ul>
);

const AreaChartComponent = ({ data, series = DEFAULT_SERIES, xKey = "month" }) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>No data available</div>
    );
  }
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
        <XAxis dataKey={xKey} axisLine={false} tickLine={false} />
        <YAxis axisLine={false} tickLine={false} />
        <Tooltip />
        {series.map((item) => (
          <Area
            key={item.key}
            type="monotone"
            dataKey={item.key}
            name={item.name}
            stroke={item.color}
            fill={item.color}
            fillOpacity={0.22}
          />
        ))}
        <Legend
          verticalAlign="bottom"
          align="center"
          height={58}
          content={<ColorCodedLegend />}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default AreaChartComponent;
