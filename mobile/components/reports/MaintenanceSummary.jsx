import React, { useMemo } from "react";
import { View } from "react-native";
import { InfoCard, FieldRow } from "../common/MobileModule";
import PieChart from "../common/PieChart";

export default function MaintenanceSummary({ tasks = [], loading = false }) {
  const summaryData = useMemo(() => {
    const repaired = tasks.filter((task) => String(task.status || "").toLowerCase().includes("repair") || String(task.status || "").toLowerCase().includes("complete")).length;
    const pending = tasks.filter((task) => !String(task.status || "").toLowerCase().includes("complete")).length;
    const overdue = tasks.filter((task) => {
      const due = new Date(task.dueDate || task.endDateTime || task.dateRectified);
      return !Number.isNaN(due.getTime()) && due < new Date();
    }).length;

    return [
      { label: "Repaired/Completed", value: repaired },
      { label: "Pending", value: pending },
      { label: "Overdue", value: overdue },
    ];
  }, [tasks]);

  return (
    <InfoCard
      title="Maintenance Insights"
      subtitle={loading ? "Loading summary..." : "High-level health indicators"}
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {summaryData.map((item) => (
          <FieldRow key={item.label} label={item.label} value={item.value} />
        ))}
      </View>
      <View style={{ marginTop: 6, alignItems: "center" }}>
        <PieChart data={summaryData} />
      </View>
    </InfoCard>
  );
}
