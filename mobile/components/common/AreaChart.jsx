import React from "react";
import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
import AppText from "./AppText";
import { COLORS } from "../../stylesheets/colors";

const DEFAULT_SERIES = [{ key: "value", color: "#26866f", name: "Value" }];
const MIN_CHART_WIDTH = 320;
const POINT_SLOT_WIDTH = 92;
const CHART_SIDE_PADDING = 128;

const getPointValue = (item, key) => Number(item?.[key]) || 0;
const formatAxisLabel = (value) => {
  const label = String(value || "").trim();
  const compactLabel = label
    .replace(/aircraft/gi, "AC")
    .replace(/component/gi, "Comp.");
  if (compactLabel.length <= 18) return compactLabel;

  return `${compactLabel.slice(0, 17)}...`;
};

const buildChartConfig = (series) => ({
  backgroundColor: COLORS.white,
  backgroundGradientFrom: COLORS.white,
  backgroundGradientTo: COLORS.white,
  decimalPlaces: 0,
  color: (opacity = 1) => `${series[0]?.color || COLORS.primaryLight}${Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0")}`,
  labelColor: () => COLORS.grayDark,
  propsForBackgroundLines: {
    stroke: "#f0f0f0",
    strokeDasharray: "3 3",
  },
  propsForDots: {
    r: "3",
    strokeWidth: "2",
    stroke: COLORS.white,
  },
});

export default function AreaChart({
  data = [],
  height = 180,
  series = DEFAULT_SERIES,
  xKey,
}) {
  const { width: windowWidth } = useWindowDimensions();
  const safeData = Array.isArray(data) ? data.slice(0, 8) : [];
  const safeSeries = Array.isArray(series) && series.length ? series : DEFAULT_SERIES;
  const viewportWidth = Math.min(Math.max(windowWidth - 68, 260), 560);
  const chartWidth = Math.max(
    MIN_CHART_WIDTH,
    viewportWidth,
    safeData.length * POINT_SLOT_WIDTH + CHART_SIDE_PADDING,
  );
  const chartHeight = Math.max(height + 42, 216);
  const canScrollHorizontally = chartWidth > viewportWidth;

  if (!safeData.length) {
    return <AppText style={styles.emptyText}>No chart data</AppText>;
  }

  const labels = safeData.map((item) =>
    formatAxisLabel(item?.[xKey] || item?.label || item?.month || item?.date),
  );
  const datasets = safeSeries.map((entry) => ({
    data: safeData.map((item) => getPointValue(item, entry.key)),
    color: (opacity = 1) => `${entry.color}${Math.round(opacity * 255)
      .toString(16)
      .padStart(2, "0")}`,
    strokeWidth: 2.5,
  }));

  return (
    <View style={styles.wrap}>
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
        <LineChart
          data={{ labels, datasets }}
          width={chartWidth}
          height={chartHeight}
          chartConfig={buildChartConfig(safeSeries)}
          bezier
          fromZero
          withShadow
          withInnerLines
          withOuterLines={false}
          segments={4}
          verticalLabelRotation={18}
          xLabelsOffset={4}
          style={styles.chart}
        />
      </ScrollView>

      <View style={styles.legendRow}>
        {safeSeries.map((entry) => (
          <View key={entry.key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: entry.color }]} />
            <AppText style={styles.legendText}>{entry.name || entry.key}</AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    width: "100%",
  },
  chart: {
    borderRadius: 8,
    marginLeft: -18,
  },
  chartScroller: {
    paddingLeft: 0,
    paddingRight: 14,
    paddingBottom: 18,
  },
  emptyText: {
    color: COLORS.grayDark,
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 24,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: COLORS.grayDark,
    fontSize: 10,
    fontWeight: "600",
  },
});
