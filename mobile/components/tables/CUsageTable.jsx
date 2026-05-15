import React, { useMemo } from "react";
import { SimpleRowsTable } from "./_SimpleRowsTable";

export default function CUsageTable({ records = [] }) {
  const rows = useMemo(() => {
    const usage = records.reduce((acc, record) => {
      const aircraft = record.aircraft || "Unknown";
      const count = (record.parts || []).filter((part) => part.rowType !== "header" && part.componentName).length;
      acc[aircraft] = (acc[aircraft] || 0) + count;
      return acc;
    }, {});

    return Object.entries(usage)
      .map(([aircraft, components]) => ({ aircraft, components }))
      .sort((a, b) => b.components - a.components);
  }, [records]);

  return (
    <SimpleRowsTable
      title="Component Usage Table"
      subtitle="Component volume by aircraft"
      rows={rows}
      columns={[{ key: "aircraft", label: "Aircraft" }, { key: "components", label: "Components" }]}
    />
  );
}
