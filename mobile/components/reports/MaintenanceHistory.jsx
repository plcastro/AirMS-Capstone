import React, { useMemo } from "react";
import { InfoCard } from "../common/MobileModule";
import FailureAnalysisChart from "../common/FailureAnalysisChart";

const normalizeStatus = (value) => String(value || "Unknown").replace(/_/g, " ").trim();

export default function MaintenanceHistory({ tasks = [], loading = false }) {
  const rows = useMemo(() => {
    const counts = tasks.reduce((acc, task) => {
      const label = normalizeStatus(task.status);
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [tasks]);

  return (
    <InfoCard
      title="Maintenance History"
      subtitle={loading ? "Loading task history..." : "Status distribution of maintenance tasks"}
    >
      <FailureAnalysisChart rows={rows} />
    </InfoCard>
  );
}
