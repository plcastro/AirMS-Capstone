import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card } from "antd";

const RepairFrequencyChart = ({ data, title }) => {
  return (
    <Card
      title={title || "Aircraft repair frequency"}
      variant="borderless"
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)", borderRadius: "8px" }}
    >
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
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
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#bfbfbf", fontSize: 12 }}
              dy={10}
            />

            <YAxis
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#bfbfbf", fontSize: 12 }}
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
              align="left"
              iconType="circle"
              wrapperStyle={{ paddingTop: "20px" }}
            />

            <Area
              type="monotone"
              dataKey="2810"
              stackId="1"
              stroke="#9d50f0"
              fill="#9d50f0"
              fillOpacity={0.6}
            />

            <Area
              type="monotone"
              dataKey="RP-C7057"
              stackId="1"
              stroke="#38b2ac"
              fill="#38b2ac"
              fillOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="RP-C7226"
              stackId="1"
              stroke="#f6ad55"
              fill="#f6ad55"
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default RepairFrequencyChart;
