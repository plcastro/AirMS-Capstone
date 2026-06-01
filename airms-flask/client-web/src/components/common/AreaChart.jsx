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
        <Legend />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default AreaChartComponent;
