import React, { useMemo } from "react";
import AppText from "../common/AppText";
import { InfoCard } from "../common/MobileModule";
import PieChart, { CHART_PALETTE } from "../common/PieChart";
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

export default function MaintenanceHistory({ tasks = [], loading = false }) {
  const rows = useMemo(() => {
    const counts = tasks.reduce((acc, task) => {
      const label = normalizeStatus(task.status);
      if (isOverallLabel(label)) return acc;
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .sort(([, valueA], [, valueB]) => valueB - valueA)
      .map(([label, value], index) => ({
        label,
        value,
        fill: CHART_PALETTE[index % CHART_PALETTE.length],
      }));
  }, [tasks]);

  return (
    <InfoCard
      title="Maintenance History"
      subtitle={loading ? "Loading task history..." : "Status distribution of maintenance tasks"}
    >
      {rows.length ? (
        <PieChart data={rows} size={180} fitToWidth />
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
