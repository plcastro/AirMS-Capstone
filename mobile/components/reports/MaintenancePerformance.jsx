import React, { useMemo } from "react";
import AppText from "../common/AppText";
import {
  View
} from "react-native";
import { InfoCard, FieldRow } from "../common/MobileModule";
import RepairFrequencyChart from "../common/RepairFrequencyChart";
import { COLORS } from "../../stylesheets/colors";

const monthLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleString("en-US", { month: "short", year: "numeric" });
};

const monthStart = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

export default function MaintenancePerformance({ tasks = [] }) {
  const trendData = useMemo(() => {
    const counts = tasks.reduce((acc, task) => {
      const periodStart = monthStart(
        task.updatedAt || task.createdAt || task.dueDate,
      );
      const key = periodStart ? periodStart.toISOString() : "no-date";
      const label = periodStart ? monthLabel(periodStart) : "No date";

      if (!acc[key]) {
        acc[key] = {
          label,
          order: periodStart ? periodStart.getTime() : Number.MAX_SAFE_INTEGER,
          value: 0,
        };
      }

      acc[key].value += 1;
      return acc;
    }, {});

    return Object.values(counts)
      .sort((left, right) => left.order - right.order)
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
      <AppText style={{ color: COLORS.grayDark, fontSize: 11, marginTop: 6 }}>
        Displays count of task activity over recent months.
      </AppText>
    </InfoCard>
  );
}
