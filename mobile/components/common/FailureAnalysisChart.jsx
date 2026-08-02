import React from "react";
import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { BarChart } from "react-native-chart-kit";
import AppText from "./AppText";
import { COLORS } from "../../stylesheets/colors";
import { CHART_PALETTE } from "./PieChart";

const DEFAULT_BAR_COLOR = CHART_PALETTE[0];
const MIN_CHART_WIDTH = 320;
const BAR_SLOT_WIDTH = 98;
const CHART_SIDE_PADDING = 128;

const formatAxisLabel = (value) => {
  const label = String(value || "Unknown").trim();
  const compactLabel = label
    .replace(/requisition/gi, "Req.")
    .replace(/maintenance/gi, "Maint.")
    .replace(/aircraft/gi, "AC");
  if (compactLabel.length <= 18) return compactLabel;

  return `${compactLabel.slice(0, 17)}...`;
};

const chartConfig = {
  backgroundColor: COLORS.white,
  backgroundGradientFrom: COLORS.white,
  backgroundGradientTo: COLORS.white,
  decimalPlaces: 0,
  color: (opacity = 1) => `${DEFAULT_BAR_COLOR}${Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0")}`,
  labelColor: () => COLORS.grayDark,
  propsForBackgroundLines: {
    stroke: "#f0f0f0",
    strokeDasharray: "3 3",
  },
  barPercentage: 0.62,
};

export default function FailureAnalysisChart({
  rows = [],
  data = [],
  legendLabel = "Record Count",
  emptyText = "No chart data available",
}) {
  const { width: windowWidth } = useWindowDimensions();
  const source = Array.isArray(data) && data.length ? data : rows;
  const safeRows = source
    .map((row, index) => ({
      label: row.label || row.name || "Unknown",
      value: Number(row.value ?? row.failures) || 0,
      fill: row.fill || row.color || CHART_PALETTE[index % CHART_PALETTE.length],
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const viewportWidth = Math.min(Math.max(windowWidth - 68, 260), 560);
  const chartWidth = Math.max(
    MIN_CHART_WIDTH,
    viewportWidth,
    safeRows.length * BAR_SLOT_WIDTH + CHART_SIDE_PADDING,
  );
  const canScrollHorizontally = chartWidth > viewportWidth;

  if (!safeRows.length) {
    return <AppText style={styles.emptyText}>{emptyText}</AppText>;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: safeRows[0]?.fill || DEFAULT_BAR_COLOR },
            ]}
          />
          <AppText style={styles.legendText}>{legendLabel}</AppText>
        </View>
      </View>

      <ScrollView
        horizontal
        bounces={false}
        alwaysBounceHorizontal={false}
        disableScrollViewPanResponder
        directionalLockEnabled
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        scrollEnabled={canScrollHorizontally}
        showsHorizontalScrollIndicator={canScrollHorizontally}
        contentContainerStyle={styles.chartScroller}
        style={{ maxWidth: viewportWidth }}
      >
        <BarChart
          data={{
            labels: safeRows.map((row) => formatAxisLabel(row.label)),
            datasets: [
              {
                data: safeRows.map((row) => row.value),
                colors: safeRows.map(
                  (row) => (opacity = 1) =>
                    `${row.fill}${Math.round(opacity * 255)
                      .toString(16)
                      .padStart(2, "0")}`,
                ),
              },
            ],
          }}
          width={chartWidth}
          height={276}
          chartConfig={chartConfig}
          fromZero
          showValuesOnTopOfBars
          withCustomBarColorFromData
          flatColor
          withInnerLines
          withHorizontalLabels
          withVerticalLabels
          verticalLabelRotation={18}
          yAxisLabel=""
          yAxisSuffix=""
          xLabelsOffset={4}
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
    marginLeft: -18,
  },
  chartScroller: {
    paddingLeft: 0,
    paddingRight: 14,
    paddingBottom: 20,
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
