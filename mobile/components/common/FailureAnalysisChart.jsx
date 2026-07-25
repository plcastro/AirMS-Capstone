import React from "react";
import { View, StyleSheet } from "react-native";
import AppText from "./AppText";
import { COLORS } from "../../stylesheets/colors";

const BAR_COLORS = ["#ff4d4f", "#faad14", "#1890ff", "#26866f", "#722ed1", "#13c2c2"];

export default function FailureAnalysisChart({ rows = [], data = [] }) {
  const source = Array.isArray(data) && data.length ? data : rows;
  const safeRows = source
    .map((row) => ({
      label: row.label || row.name || "Unknown",
      value: Number(row.value ?? row.failures) || 0,
      fill: row.fill,
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const maxValue = Math.max(...safeRows.map((row) => row.value), 1);

  if (!safeRows.length) {
    return <AppText style={styles.emptyText}>No critical component data available</AppText>;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#ff4d4f" }]} />
          <AppText style={styles.legendText}>Critical Component Count</AppText>
        </View>
      </View>

      {safeRows.map((row, index) => {
        const widthPct = Math.max((row.value / maxValue) * 100, 4);
        const fill = row.fill || BAR_COLORS[index % BAR_COLORS.length];
        return (
          <View key={`${row.label}-${index}`} style={styles.row}>
            <View style={styles.rowHeader}>
              <AppText style={styles.rowLabel} numberOfLines={1}>
                {row.label}
              </AppText>
              <AppText style={styles.rowValue}>{row.value}</AppText>
            </View>
            <View style={styles.track}>
              <View style={[styles.bar, { width: `${widthPct}%`, backgroundColor: fill }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 6,
  },
  emptyText: {
    color: COLORS.grayDark,
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 22,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 6,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  legendText: {
    color: COLORS.grayDark,
    fontSize: 10,
    fontWeight: "700",
  },
  row: {
    marginBottom: 10,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    columnGap: 10,
  },
  rowLabel: {
    flex: 1,
    color: COLORS.black,
    fontSize: 12,
    fontWeight: "700",
  },
  rowValue: {
    color: COLORS.grayDark,
    fontSize: 12,
    fontWeight: "700",
  },
  track: {
    height: 14,
    backgroundColor: "#f5f5f5",
    borderRadius: 4,
    marginTop: 5,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
});
