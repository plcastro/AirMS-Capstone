import React, { useMemo } from "react";
import { SimpleRowsTable } from "./_SimpleRowsTable";

export default function PMonitoringTable({ records = [] }) {
  const rows = useMemo(
    () =>
      records.flatMap((record) =>
        (record.parts || [])
          .filter((part) => part.rowType !== "header" && part.componentName)
          .map((part) => ({
            aircraft: record.aircraft || "Unknown",
            component: part.componentName,
            due: part.due || "N/A",
          })),
      ),
    [records],
  );

  return (
    <SimpleRowsTable
      title="Parts Monitoring Table"
      subtitle="Component due monitoring"
      rows={rows}
      columns={[
        { key: "aircraft", label: "Aircraft" },
        { key: "component", label: "Component" },
        { key: "due", label: "Due" },
      ]}
    />
  );
}
