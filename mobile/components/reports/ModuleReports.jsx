import React, { useMemo } from "react";
import { InfoCard } from "../common/MobileModule";
import FailureAnalysisChart from "../common/FailureAnalysisChart";

const normalizeStatus = (value) => String(value || "Unknown").replace(/_/g, " ").trim();

const countRows = (records, getLabel) => {
  const counts = records.reduce((acc, record) => {
    const label = getLabel(record) || "Unknown";
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
};

export function FlightLogReport({ records = [], loading = false }) {
  const rows = useMemo(() => countRows(records, (item) => item.rpc || item.aircraft), [records]);
  return (
    <InfoCard title="Flight Log Report" subtitle={loading ? "Loading records..." : "Flight logs by aircraft"}>
      <FailureAnalysisChart
        rows={rows}
        legendLabel="Flight Log Count"
        emptyText="No flight log data available"
      />
    </InfoCard>
  );
}

export function InspectionReport({ title = "Inspection Report", records = [], loading = false }) {
  const rows = useMemo(() => countRows(records, (item) => normalizeStatus(item.status)), [records]);
  return (
    <InfoCard title={title} subtitle={loading ? "Loading records..." : "Inspection status distribution"}>
      <FailureAnalysisChart
        rows={rows}
        legendLabel="Inspection Count"
        emptyText="No inspection data available"
      />
    </InfoCard>
  );
}

export function PartsRequisitionReport({ records = [], loading = false }) {
  const rows = useMemo(() => countRows(records, (item) => normalizeStatus(item.status)), [records]);
  return (
    <InfoCard title="Parts Requisition Report" subtitle={loading ? "Loading records..." : "Request status distribution"}>
      <FailureAnalysisChart
        rows={rows}
        legendLabel="Parts Request Count"
        emptyText="No parts requisition data available"
      />
    </InfoCard>
  );
}
