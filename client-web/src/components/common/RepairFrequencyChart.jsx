import React, { useEffect, useRef, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card } from "antd";

const RepairFrequencyChart = ({ data, title }) => {
  const containerRef = useRef(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: 300 });
  const chartData = data || [];
  const seriesKeys = chartData.length > 0
    ? Object.keys(chartData[0]).filter((key) => key !== "date")
    : [];
  const colors = ["#9d50f0", "#38b2ac", "#f6ad55", "#ef4444", "#2563eb"];

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateSizeState = () => {
      const { clientWidth, clientHeight } = element;
      setChartSize({
        width: Math.max(clientWidth, 0),
        height: Math.max(clientHeight, 300),
      });
    };

    updateSizeState();
    const observer = new ResizeObserver(updateSizeState);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <Card
      title={title || "Aircraft repair frequency"}
      variant="borderless"
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)", borderRadius: "8px" }}
    >
      <div ref={containerRef} style={{ width: "100%", height: 300, minHeight: 300 }}>
        {chartSize.width > 0 && (
          <AreaChart width={chartSize.width} height={chartSize.height} data={chartData}>
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

            {seriesKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stackId="1"
                stroke={colors[index % colors.length]}
                fill={colors[index % colors.length]}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        )}
      </div>
    </Card>
  );
};

export default RepairFrequencyChart;
