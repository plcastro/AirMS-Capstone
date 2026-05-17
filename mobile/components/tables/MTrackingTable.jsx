import React, { useMemo } from "react";
import { SimpleRowsTable } from "./_SimpleRowsTable";

export default function MTrackingTable({ records = [] }) {
  const rows = useMemo(
    () =>
      records.map((record) => ({
        aircraft: record.aircraft || "Unknown",
        totalParts: (record.parts || []).filter((part) => part.rowType !== "header").length,
        updatedAt: record.updatedAt || record.createdAt || "N/A",
      })),
    [records],
  );

  return (
    <SimpleRowsTable
      title="Maintenance Tracking Table"
      subtitle="Parts-monitoring records"
      rows={rows}
      columns={[
        { key: "aircraft", label: "Aircraft" },
        { key: "totalParts", label: "Tracked Parts" },
        { key: "updatedAt", label: "Updated" },
      ]}
    />
  );
}
