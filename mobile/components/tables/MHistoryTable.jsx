import React, { useMemo } from "react";
import { SimpleRowsTable } from "./_SimpleRowsTable";

export default function MHistoryTable({ tasks = [] }) {
  const rows = useMemo(
    () =>
      tasks
        .slice()
        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
        .map((task) => ({
          aircraft: task.aircraft || "N/A",
          task: task.title || "Untitled",
          status: task.status || "Unknown",
          updated: task.updatedAt || task.createdAt || "N/A",
        })),
    [tasks],
  );

  return (
    <SimpleRowsTable
      title="Maintenance History Table"
      subtitle="Recent maintenance task records"
      rows={rows}
      columns={[
        { key: "aircraft", label: "Aircraft" },
        { key: "task", label: "Task" },
        { key: "status", label: "Status" },
        { key: "updated", label: "Updated" },
      ]}
    />
  );
}
