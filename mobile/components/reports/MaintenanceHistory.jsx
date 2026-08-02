import React, { useMemo } from "react";
import { InfoCard } from "../common/MobileModule";
import FailureAnalysisChart from "../common/FailureAnalysisChart";

const normalizeStatus = (value) => String(value || "Unknown").replace(/_/g, " ").trim();
const statusColor = (status) => {
  const text = String(status || "").toLowerCase();
  if (text.includes("complete") || text.includes("repair")) return "#26866f";
  if (text.includes("pending") || text.includes("progress")) return "#faad14";
  if (text.includes("overdue") || text.includes("critical")) return "#f5222d";
  if (text.includes("assigned")) return "#1890ff";
  return "#722ed1";
};

export default function MaintenanceHistory({ tasks = [], loading = false }) {
  const rows = useMemo(() => {
    const counts = tasks.reduce((acc, task) => {
      const label = normalizeStatus(task.status);
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([label, value]) => ({ label, value, fill: statusColor(label) }))
      .sort((a, b) => b.value - a.value);
  }, [tasks]);

  return (
    <InfoCard
      title="Maintenance History"
      subtitle={loading ? "Loading task history..." : "Status distribution of maintenance tasks"}
    >
      <FailureAnalysisChart
        rows={rows}
        legendLabel="Maintenance Task Count"
        emptyText="No maintenance history data available"
      />
    </InfoCard>
  );
}
