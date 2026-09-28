import React, { useMemo } from "react";
import { InfoCard } from "../common/MobileModule";
import AreaChart from "../common/AreaChart";

const COMPONENT_USAGE_SERIES = [
  { key: "value", name: "Components", color: "#1890ff" },
];

export default function ComponentUsage({ records = [], loading = false }) {
  const usageData = useMemo(() => {
    const counts = records.reduce((acc, record) => {
      const aircraft = record.aircraft || "Unknown";
      const components = (record.parts || []).filter(
        (part) => part.rowType !== "header" && part.componentName,
      ).length;
      acc[aircraft] = (acc[aircraft] || 0) + components;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [records]);

  return (
    <InfoCard
      title="Component Analysis"
      subtitle={loading ? "Loading components..." : "Tracked component counts by aircraft"}
    >
      <AreaChart
        data={usageData}
        height={160}
        series={COMPONENT_USAGE_SERIES}
        xKey="label"
      />
    </InfoCard>
  );
}
