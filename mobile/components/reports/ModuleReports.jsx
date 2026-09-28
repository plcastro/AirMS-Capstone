import React, { useMemo } from "react";
import AppText from "../common/AppText";
import { InfoCard } from "../common/MobileModule";
import PieChart, { CHART_PALETTE } from "../common/PieChart";
import { COLORS } from "../../stylesheets/colors";

const normalizeStatus = (value) => String(value || "").replace(/_/g, " ").trim();
const OVERALL_LABELS = new Set(["all", "overall", "total", "totals"]);
const UNKNOWN_LABELS = new Set(["", "unknown", "n/a", "na", "unassigned"]);

const normalizeLabel = (value) =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();

const isOverallLabel = (value) => {
  return OVERALL_LABELS.has(normalizeLabel(value));
};

const isKnownLabel = (value) => !UNKNOWN_LABELS.has(normalizeLabel(value));

const countRows = (records, getLabel) => {
  const counts = records.reduce((acc, record) => {
    const label = String(getLabel(record) || "").trim();
    if (!isKnownLabel(label) || isOverallLabel(label)) return acc;
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([label, value], index) => ({
      label,
      value,
      fill: CHART_PALETTE[index % CHART_PALETTE.length],
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
};

const ReportPieChart = ({ rows = [], emptyText, fitToWidth = false }) => {
  if (!rows.length) {
    return (
      <AppText
        style={{
          color: COLORS.grayDark,
          fontSize: 12,
          paddingVertical: 22,
          textAlign: "center",
        }}
      >
        {emptyText}
      </AppText>
    );
  }

  return <PieChart data={rows} size={190} fitToWidth={fitToWidth} />;
};

export function FlightLogReport({ records = [], loading = false }) {
  const rows = useMemo(() => countRows(records, (item) => item.rpc || item.aircraft), [records]);
  return (
    <InfoCard title="Flight Log Report" subtitle={loading ? "Loading records..." : "Flight logs by aircraft"}>
      <ReportPieChart
        rows={rows}
        emptyText="No flight log data available"
        fitToWidth
      />
    </InfoCard>
  );
}

export function InspectionReport({ title = "Inspection Report", records = [], loading = false }) {
  const rows = useMemo(() => countRows(records, (item) => normalizeStatus(item.status)), [records]);
  return (
    <InfoCard title={title} subtitle={loading ? "Loading records..." : "Inspection status distribution"}>
      <ReportPieChart
        rows={rows}
        emptyText="No inspection data available"
      />
    </InfoCard>
  );
}

export function PartsRequisitionReport({ records = [], loading = false }) {
  const rows = useMemo(() => countRows(records, (item) => normalizeStatus(item.status)), [records]);
  return (
    <InfoCard title="Parts Requisition Report" subtitle={loading ? "Loading records..." : "Request status distribution"}>
      <ReportPieChart
        rows={rows}
        emptyText="No parts requisition data available"
        fitToWidth
      />
    </InfoCard>
  );
}
