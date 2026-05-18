import React, { useMemo } from "react";
import { SimpleRowsTable } from "./_SimpleRowsTable";

export default function FLogTable({ records = [] }) {
  const rows = useMemo(
    () =>
      records.map((record) => ({
        aircraft: record.rpc || record.aircraft || "Unknown",
        status: record.status || "Unknown",
        date: record.date || record.createdAt || "N/A",
      })),
    [records],
  );

  return (
    <SimpleRowsTable
      title="Flight Log Table"
      subtitle="Flight log records"
      rows={rows}
      columns={[
        { key: "aircraft", label: "Aircraft" },
        { key: "status", label: "Status" },
        { key: "date", label: "Date" },
      ]}
    />
  );
}
