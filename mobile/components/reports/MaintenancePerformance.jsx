import React, { useMemo } from "react";
import { View, Text } from "react-native";
import { InfoCard, FieldRow } from "../common/MobileModule";
import RepairFrequencyChart from "../common/RepairFrequencyChart";
import { COLORS } from "../../stylesheets/colors";

const monthLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleString("en-US", { month: "short", year: "numeric" });
};

export default function MaintenancePerformance({ tasks = [] }) {
  const trendData = useMemo(() => {
    const counts = tasks.reduce((acc, task) => {
      const label = monthLabel(task.updatedAt || task.createdAt || task.dueDate);
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .slice(-8);
  }, [tasks]);

  return (
    <InfoCard title="Performance Overview" subtitle="Task trend and throughput">
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        <FieldRow label="Total Tasks" value={tasks.length} />
        <FieldRow
          label="Completed"
          value={tasks.filter((task) => String(task.status || "").toLowerCase().includes("complete")).length}
        />
      </View>
      <View style={{ marginTop: 8 }}>
        <RepairFrequencyChart data={trendData} />
      </View>
      <Text style={{ color: COLORS.grayDark, fontSize: 11, marginTop: 6 }}>
        Displays count of task activity over recent months.
      </Text>
    </InfoCard>
  );
}
