import React, { useMemo } from "react";
import { SimpleRowsTable } from "./_SimpleRowsTable";

export default function PRMTable({ records = [] }) {
  const rows = useMemo(
    () =>
      records.map((record) => ({
        requestNo: record.requestNo || record.requisitionNumber || record._id || "N/A",
        status: record.status || "Unknown",
        dateRequested: record.dateRequested || record.createdAt || "N/A",
      })),
    [records],
  );

  return (
    <SimpleRowsTable
      title="Parts Requisition Monitoring Table"
      subtitle="Requisition requests"
      rows={rows}
      columns={[
        { key: "requestNo", label: "Request" },
        { key: "status", label: "Status" },
        { key: "dateRequested", label: "Date Requested" },
      ]}
    />
  );
}
