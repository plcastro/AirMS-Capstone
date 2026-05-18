import React, { useMemo } from "react";
import { SimpleRowsTable } from "./_SimpleRowsTable";

export default function MSummaryTable({ tasks = [] }) {
  const rows = useMemo(() => {
    const counts = tasks.reduce((acc, task) => {
      const status = String(task.status || "Unknown");
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [tasks]);

  return (
    <SimpleRowsTable
      title="Maintenance Summary Table"
      subtitle="Task counts by status"
      rows={rows}
      columns={[{ key: "status", label: "Status" }, { key: "count", label: "Count" }]}
    />
  );
}
