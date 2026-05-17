import React, { useMemo } from "react";
import { SimpleRowsTable } from "./_SimpleRowsTable";

export default function MLogTable({ tasks = [] }) {
  const rows = useMemo(
    () =>
      tasks.map((task) => ({
        aircraft: task.aircraft || "N/A",
        maintenanceType: task.maintenanceType || "N/A",
        mechanic: task.assignedToName || task.assignedMechanic || "Unassigned",
        dueDate: task.dueDate || task.endDateTime || "N/A",
      })),
    [tasks],
  );

  return (
    <SimpleRowsTable
      title="Maintenance Log Table"
      subtitle="Maintenance schedule and assignment"
      rows={rows}
      columns={[
        { key: "aircraft", label: "Aircraft" },
        { key: "maintenanceType", label: "Type" },
        { key: "mechanic", label: "Mechanic" },
        { key: "dueDate", label: "Due Date" },
      ]}
    />
  );
}
