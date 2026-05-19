import React, { useMemo } from "react";
import { View } from "react-native";
import { FieldRow, InfoCard } from "../common/MobileModule";

const countCompletedLike = (records = [], statusKeys = ["status"]) =>
  records.filter((record) => {
    const text = statusKeys
      .map((key) => String(record?.[key] || ""))
      .join(" ")
      .toLowerCase();
    return ["completed", "approved", "released", "accepted", "done"].some((k) =>
      text.includes(k),
    );
  }).length;

export default function GeneralReports({
  tasks = [],
  flightLogs = [],
  preInspections = [],
  postInspections = [],
  partsRequisitions = [],
  loading = false,
}) {
  const rows = useMemo(() => {
    const data = [
      { label: "Task Assignment", total: tasks.length, done: countCompletedLike(tasks) },
      { label: "Flight Log", total: flightLogs.length, done: countCompletedLike(flightLogs) },
      {
        label: "Pre-Inspection",
        total: preInspections.length,
        done: countCompletedLike(preInspections),
      },
      {
        label: "Post-Inspection",
        total: postInspections.length,
        done: countCompletedLike(postInspections),
      },
      {
        label: "Parts Requisition",
        total: partsRequisitions.length,
        done: countCompletedLike(partsRequisitions),
      },
    ];
    return data.map((item) => ({
      ...item,
      open: Math.max(item.total - item.done, 0),
      percent: item.total > 0 ? Math.round((item.done / item.total) * 100) : 0,
    }));
  }, [tasks, flightLogs, preInspections, postInspections, partsRequisitions]);

  const totals = rows.reduce(
    (acc, row) => {
      acc.total += row.total;
      acc.done += row.done;
      acc.open += row.open;
      return acc;
    },
    { total: 0, done: 0, open: 0 },
  );

  return (
    <InfoCard
      title="General Reports"
      subtitle={loading ? "Loading general summary..." : "Cross-module overview"}
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        <FieldRow label="All Records" value={totals.total} />
        <FieldRow label="Completed / Closed" value={totals.done} />
        <FieldRow label="Open / Pending" value={totals.open} />
      </View>
      <View style={{ marginTop: 8 }}>
        {rows.map((row) => (
          <View
            key={row.label}
            style={{
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 10,
              padding: 10,
              marginBottom: 8,
            }}
          >
            <FieldRow label="Module" value={row.label} />
            <FieldRow label="Total" value={row.total} />
            <FieldRow label="Completed" value={row.done} />
            <FieldRow label="Completion" value={`${row.percent}%`} />
          </View>
        ))}
      </View>
    </InfoCard>
  );
}

