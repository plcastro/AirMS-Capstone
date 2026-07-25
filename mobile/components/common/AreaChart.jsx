import React from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
import AppText from "./AppText";
import { COLORS } from "../../stylesheets/colors";

const DEFAULT_SERIES = [{ key: "value", color: "#26866f", name: "Value" }];
const MIN_WIDTH = 280;

const getPointValue = (item, key) => Number(item?.[key]) || 0;

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
  const chartWidth = Math.max(MIN_WIDTH, Math.min(windowWidth - 44, 560));
  const chartHeight = Math.max(height, 160);

  if (!safeData.length) {
    return <AppText style={styles.emptyText}>No chart data</AppText>;
  }

  const labels = safeData.map((item) =>
    String(item?.[xKey] || item?.label || item?.month || item?.date || "").slice(0, 8),
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
        style={styles.chart}
      />

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
    marginLeft: -8,
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
