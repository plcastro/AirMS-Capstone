import React from "react";
import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { PieChart as ChartKitPieChart } from "react-native-chart-kit";
import AppText from "./AppText";
import { COLORS } from "../../stylesheets/colors";

export const CHART_PALETTE = [
  "#26866f",
  "#1890ff",
  "#faad14",
  "#f5222d",
  "#722ed1",
  "#13c2c2",
  "#eb2f96",
  "#52c41a",
];

const EMPTY_DATA = [{ label: "No data", name: "No data", value: 1, fill: "#d9d9d9" }];

const chartConfig = {
  backgroundColor: COLORS.white,
  backgroundGradientFrom: COLORS.white,
  backgroundGradientTo: COLORS.white,
  color: (opacity = 1) => `rgba(38, 134, 111, ${opacity})`,
  labelColor: () => COLORS.grayDark,
};

export default function PieChart({
  data = [],
  size = 196,
  innerRadius = 0,
  centerValue,
  centerLabel,
}) {
  const { width: windowWidth } = useWindowDimensions();
  const normalizedData = (Array.isArray(data) && data.length ? data : EMPTY_DATA)
    .map((item, index) => ({
      name: item.label || item.name || `Item ${index + 1}`,
      label: item.label || item.name || `Item ${index + 1}`,
      value: Number(item.value) || 0,
      color: item.fill || item.color || CHART_PALETTE[index % CHART_PALETTE.length],
      legendFontColor: COLORS.grayDark,
      legendFontSize: 11,
    }))
    .filter((item) => item.value > 0);
  const chartData = normalizedData.length ? normalizedData : EMPTY_DATA.map((item) => ({
    ...item,
    color: item.fill,
    legendFontColor: COLORS.grayDark,
    legendFontSize: 11,
  }));
  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const showDonutCenter = centerValue || innerRadius > 0;
  const holeSize = Math.max(innerRadius * 1.72, 74);
  const viewportWidth = Math.min(Math.max(windowWidth - 68, 260), 560);
  const contentWidth = Math.max(
    320,
    viewportWidth,
    size + 76,
    Math.min(620, Math.max(size + 76, chartData.length * 132)),
  );
  const canScrollHorizontally = contentWidth > viewportWidth;

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
        style={{ maxWidth: viewportWidth }}
        contentContainerStyle={styles.scroller}
      >
        <View style={[styles.content, { width: contentWidth }]}>
          <View style={[styles.chartFrame, { width: size, height: size }]}>
            <ChartKitPieChart
              data={chartData}
              width={size}
              height={size}
              chartConfig={chartConfig}
              accessor="value"
              backgroundColor="transparent"
              paddingLeft="0"
              center={[size / 4, 0]}
              absolute
              hasLegend={false}
            />

            {showDonutCenter && (
              <View
                pointerEvents="none"
                style={[
                  styles.centerLabel,
                  {
                    width: holeSize,
                    height: holeSize,
                    borderRadius: holeSize / 2,
                    marginLeft: -holeSize / 2,
                    marginTop: -holeSize / 2,
                  },
                ]}
              >
                <AppText style={styles.centerValue}>{centerValue || total}</AppText>
                {!!centerLabel && (
                  <AppText style={styles.centerCaption} numberOfLines={2}>
                    {centerLabel}
                  </AppText>
                )}
              </View>
            )}
          </View>

          <View style={styles.legendWrap}>
            {chartData.map((item) => {
              const percent = total ? Math.round((item.value / total) * 100) : 0;
              return (
                <View key={item.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <AppText style={styles.legendText}>
                    {item.label}: {item.value} ({percent}%)
                  </AppText>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export const SDMChart = PieChart;
export const ARTChart = (props) => (
  <PieChart innerRadius={58} centerLabel="Avg. Rectification" {...props} />
);

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    width: "100%",
  },
  scroller: {
    paddingBottom: 8,
    paddingRight: 8,
  },
  content: {
    alignItems: "center",
    paddingLeft: 0,
    paddingRight: 8,
  },
  chartFrame: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  centerLabel: {
    alignItems: "center",
    backgroundColor: COLORS.white,
    justifyContent: "center",
    left: "50%",
    paddingHorizontal: 8,
    position: "absolute",
    top: "50%",
  },
  centerValue: {
    color: COLORS.primaryLight,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  centerCaption: {
    color: COLORS.grayDark,
    fontSize: 8.5,
    marginTop: 1,
    textAlign: "center",
  },
  legendWrap: {
    width: "100%",
    marginTop: 14,
    rowGap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    columnGap: 8,
    minHeight: 28,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#F7FAF9",
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
    marginTop: 3,
  },
  legendText: {
    flex: 1,
    color: COLORS.grayDark,
    fontSize: 11,
    fontWeight: "600",
  },
});
