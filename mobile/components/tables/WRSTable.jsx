import React, { useMemo } from "react";
import { SimpleRowsTable } from "./_SimpleRowsTable";

export default function WRSTable({ records = [] }) {
  const rows = useMemo(
    () =>
      records.flatMap((record) =>
        (record.items || []).map((item, index) => ({
          requestNo: record.requestNo || record.requisitionNumber || record._id || "N/A",
          item: item.partName || item.description || `Item ${index + 1}`,
          quantity: item.quantity || 0,
          status: record.status || "Unknown",
        })),
      ),
    [records],
  );

  return (
    <SimpleRowsTable
      title="WRS Table"
      subtitle="Warehouse requisition item lines"
      rows={rows}
      columns={[
        { key: "requestNo", label: "Request" },
        { key: "item", label: "Item" },
        { key: "quantity", label: "Qty" },
        { key: "status", label: "Status" },
      ]}
    />
  );
}
