import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Circle, Text as SvgText } from "react-native-svg";
import AppText from "./AppText";
import { COLORS } from "../../stylesheets/colors";

export const CHART_PALETTE = [
  "#26866f",
  "#1890ff",
  "#faad14",
  "#ff4d4f",
  "#722ed1",
  "#13c2c2",
  "#52c41a",
  "#eb2f96",
];

const EMPTY_DATA = [{ label: "No data", name: "No data", value: 1, fill: "#d9d9d9" }];

export default function PieChart({
  data = [],
  size = 176,
  innerRadius = 0,
  centerValue,
  centerLabel,
}) {
  const radius = size / 2 - 18;
  const center = size / 2;
  const strokeWidth = innerRadius > 0 ? radius - innerRadius : radius;
  const normalizedData = (Array.isArray(data) && data.length ? data : EMPTY_DATA)
    .map((item, index) => ({
      ...item,
      label: item.label || item.name || `Item ${index + 1}`,
      value: Number(item.value) || 0,
      fill: item.fill || CHART_PALETTE[index % CHART_PALETTE.length],
    }))
    .filter((item) => item.value > 0);
  const chartData = normalizedData.length ? normalizedData : EMPTY_DATA;
  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const circleRadius = innerRadius > 0 ? innerRadius + strokeWidth / 2 : radius / 2;
  const circumference = 2 * Math.PI * circleRadius;
  let cumulative = 0;

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={circleRadius}
          fill="transparent"
          stroke="#eef0f2"
          strokeWidth={strokeWidth}
        />
        {chartData.map((item, index) => {
          const dash = (item.value / total) * circumference;
          const gap = circumference - dash;
          const rotation = cumulative - 90;
          cumulative += (item.value / total) * 360;

          return (
            <Circle
              key={`${item.label}-${index}`}
              cx={center}
              cy={center}
              r={circleRadius}
              fill="transparent"
              stroke={item.fill}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${gap}`}
              strokeLinecap="butt"
              originX={center}
              originY={center}
              rotation={rotation}
            />
          );
        })}
        {(centerValue || innerRadius > 0) && (
          <>
            <SvgText
              x={center}
              y={center - 2}
              fill={COLORS.primaryLight}
              fontSize="17"
              fontWeight="700"
              textAnchor="middle"
            >
              {centerValue || total}
            </SvgText>
            {!!centerLabel && (
              <SvgText
                x={center}
                y={center + 14}
                fill={COLORS.grayDark}
                fontSize="8.5"
                textAnchor="middle"
              >
                {String(centerLabel).slice(0, 18)}
              </SvgText>
            )}
          </>
        )}
      </Svg>

      <View style={styles.legendWrap}>
        {chartData.map((item) => {
          const percent = total ? Math.round((item.value / total) * 100) : 0;
          return (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.fill }]} />
              <AppText style={styles.legendText}>
                {item.label}: {item.value} ({percent}%)
              </AppText>
            </View>
          );
        })}
      </View>
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
  legendWrap: {
    width: "100%",
    marginTop: 4,
    rowGap: 6,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 7,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  legendText: {
    flex: 1,
    color: COLORS.grayDark,
    fontSize: 11,
    fontWeight: "600",
  },
});
