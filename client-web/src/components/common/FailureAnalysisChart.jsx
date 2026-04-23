import React, { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AnalysisChartMockData } from "./MockData";

export const FailureAnalysisChart = () => {
  const containerRef = useRef(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: 400 });
  const rawData = AnalysisChartMockData;
  // Sort data so the most "failure prone" (highest failure count) is at the top
  const sortedData = [...rawData].sort((a, b) => b.failures - a.failures);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateSizeState = () => {
      const { clientWidth, clientHeight } = element;
      setChartSize({
        width: Math.max(clientWidth, 0),
        height: Math.max(clientHeight, 400),
      });
    };

    updateSizeState();
    const observer = new ResizeObserver(updateSizeState);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ width: "100%", height: 400, minHeight: 400 }}>
      {chartSize.width > 0 && (
        <BarChart
          width={chartSize.width}
          height={chartSize.height}
          layout="vertical"
          data={sortedData}
          margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={true}
            vertical={false}
          />

          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />

          <YAxis
            dataKey="name"
            type="category"
            width={100}
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
            name="Reported Failures"
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
      )}
    </div>
  );
};
