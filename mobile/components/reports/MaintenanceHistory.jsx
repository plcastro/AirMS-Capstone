import React, { useMemo } from "react";
import AppText from "../common/AppText";
import { InfoCard } from "../common/MobileModule";
import PieChart from "../common/PieChart";
import { COLORS } from "../../stylesheets/colors";

const normalizeStatus = (value) => String(value || "Unknown").replace(/_/g, " ").trim();
const OVERALL_LABELS = new Set(["all", "overall", "total", "totals"]);

const isOverallLabel = (value) => {
  const label = String(value || "")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  return OVERALL_LABELS.has(label);
};

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
      if (isOverallLabel(label)) return acc;
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
      {rows.length ? (
        <PieChart data={rows} size={190} />
      ) : (
        <AppText
          style={{
            color: COLORS.grayDark,
            fontSize: 12,
            paddingVertical: 22,
            textAlign: "center",
          }}
        >
          No maintenance history data available
        </AppText>
      )}
    </InfoCard>
  );
}
