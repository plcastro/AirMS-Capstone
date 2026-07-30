import React from "react";
import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { BarChart } from "react-native-chart-kit";
import AppText from "./AppText";
import { COLORS } from "../../stylesheets/colors";

const BAR_COLOR = "#ff4d4f";
const MIN_WIDTH = 280;
const BAR_SLOT_WIDTH = 76;
const CHART_SIDE_PADDING = 72;

const formatAxisLabel = (value) => {
  const label = String(value || "Unknown").trim();
  if (label.length <= 12) return label;

  return label
    .replace(/requisition/gi, "Req.")
    .replace(/maintenance/gi, "Maint.")
    .replace(/aircraft/gi, "AC")
    .slice(0, 12);
};

const chartConfig = {
  backgroundColor: COLORS.white,
  backgroundGradientFrom: COLORS.white,
  backgroundGradientTo: COLORS.white,
  decimalPlaces: 0,
  color: (opacity = 1) => `${BAR_COLOR}${Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0")}`,
  labelColor: () => COLORS.grayDark,
  propsForBackgroundLines: {
    stroke: "#f0f0f0",
    strokeDasharray: "3 3",
  },
  barPercentage: 0.62,
};

export default function FailureAnalysisChart({ rows = [], data = [] }) {
  const { width: windowWidth } = useWindowDimensions();
  const source = Array.isArray(data) && data.length ? data : rows;
  const safeRows = source
    .map((row) => ({
      label: row.label || row.name || "Unknown",
      value: Number(row.value ?? row.failures) || 0,
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const viewportWidth = Math.max(MIN_WIDTH, Math.min(windowWidth - 44, 560));
  const chartWidth = Math.max(
    viewportWidth,
    safeRows.length * BAR_SLOT_WIDTH + CHART_SIDE_PADDING,
  );

  if (!safeRows.length) {
    return <AppText style={styles.emptyText}>No critical component data available</AppText>;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: BAR_COLOR }]} />
          <AppText style={styles.legendText}>Critical Component Count</AppText>
        </View>
      </View>

      <ScrollView
        horizontal
        bounces={false}
        showsHorizontalScrollIndicator={chartWidth > viewportWidth}
        contentContainerStyle={styles.chartScroller}
        style={{ maxWidth: viewportWidth }}
      >
        <BarChart
          data={{
            labels: safeRows.map((row) => formatAxisLabel(row.label)),
            datasets: [{ data: safeRows.map((row) => row.value) }],
          }}
          width={chartWidth}
          height={236}
          chartConfig={chartConfig}
          fromZero
          showValuesOnTopOfBars
          withInnerLines
          withHorizontalLabels
          withVerticalLabels
          verticalLabelRotation={18}
          yAxisLabel=""
          yAxisSuffix=""
          style={styles.chart}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    marginTop: 6,
    width: "100%",
  },
  chart: {
    borderRadius: 8,
    marginLeft: -8,
  },
  chartScroller: {
    paddingBottom: 4,
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
});
