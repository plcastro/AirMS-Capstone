import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Line,
  Path,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import AppText from "./AppText";
import { COLORS } from "../../stylesheets/colors";

const DEFAULT_SERIES = [{ key: "value", color: "#26866f", name: "Value" }];
const CHART_WIDTH = 320;
const PAD = { top: 16, right: 16, bottom: 34, left: 34 };

const getPointValue = (item, key) => Number(item?.[key]) || 0;

const buildLinePath = (points) =>
  points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${point.x} ${point.y}`,
    )
    .join(" ");

export default function AreaChart({
  data = [],
  height = 160,
  series = DEFAULT_SERIES,
  xKey,
}) {
  const safeData = Array.isArray(data) ? data.slice(0, 8) : [];
  const safeSeries = Array.isArray(series) && series.length ? series : DEFAULT_SERIES;
  const chartHeight = Math.max(height, 130);
  const innerWidth = CHART_WIDTH - PAD.left - PAD.right;
  const innerHeight = chartHeight - PAD.top - PAD.bottom;

  if (!safeData.length) {
    return <AppText style={styles.emptyText}>No chart data</AppText>;
  }

  const maxValue = Math.max(
    ...safeData.flatMap((item) =>
      safeSeries.map((entry) => getPointValue(item, entry.key)),
    ),
    1,
  );
  const stepX = safeData.length > 1 ? innerWidth / (safeData.length - 1) : innerWidth;
  const gridValues = [0.25, 0.5, 0.75, 1];

  return (
    <View style={styles.wrap}>
      <Svg width="100%" height={chartHeight} viewBox={`0 0 ${CHART_WIDTH} ${chartHeight}`}>
        <Defs>
          {safeSeries.map((entry, index) => (
            <LinearGradient
              key={entry.key}
              id={`areaFill${index}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <Stop offset="0" stopColor={entry.color} stopOpacity="0.24" />
              <Stop offset="1" stopColor={entry.color} stopOpacity="0.04" />
            </LinearGradient>
          ))}
        </Defs>

        {gridValues.map((ratio) => {
          const y = PAD.top + innerHeight * (1 - ratio);
          return (
            <Line
              key={ratio}
              x1={PAD.left}
              x2={CHART_WIDTH - PAD.right}
              y1={y}
              y2={y}
              stroke="#f0f0f0"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          );
        })}

        <Line
          x1={PAD.left}
          x2={PAD.left}
          y1={PAD.top}
          y2={PAD.top + innerHeight}
          stroke="#eef0f2"
        />
        <Line
          x1={PAD.left}
          x2={CHART_WIDTH - PAD.right}
          y1={PAD.top + innerHeight}
          y2={PAD.top + innerHeight}
          stroke="#eef0f2"
        />

        {[0, maxValue].map((value, index) => (
          <SvgText
            key={value}
            x={PAD.left - 8}
            y={index === 0 ? PAD.top + innerHeight : PAD.top + 4}
            fill={COLORS.grayDark}
            fontSize="9"
            textAnchor="end"
          >
            {Math.round(value)}
          </SvgText>
        ))}

        {safeSeries.map((entry, seriesIndex) => {
          const points = safeData.map((item, index) => ({
            x: PAD.left + Math.round(index * stepX),
            y:
              PAD.top +
              innerHeight -
              Math.round((getPointValue(item, entry.key) / maxValue) * innerHeight),
          }));
          const linePath = buildLinePath(points);
          const areaPath = `${linePath} L ${PAD.left + innerWidth} ${PAD.top + innerHeight} L ${PAD.left} ${PAD.top + innerHeight} Z`;

          return (
            <React.Fragment key={entry.key}>
              <Path d={areaPath} fill={`url(#areaFill${seriesIndex})`} />
              <Path
                d={linePath}
                stroke={entry.color}
                strokeWidth="2.5"
                fill="none"
              />
              {points.map((point, index) => (
                <Circle
                  key={`${entry.key}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r="2.5"
                  fill={COLORS.white}
                  stroke={entry.color}
                  strokeWidth="1.5"
                />
              ))}
            </React.Fragment>
          );
        })}

        {safeData.map((item, index) => {
          if (index % Math.ceil(safeData.length / 4) !== 0 && index !== safeData.length - 1) {
            return null;
          }
          const label = String(item?.[xKey] || item?.label || item?.month || item?.date || "");
          return (
            <SvgText
              key={`${label}-${index}`}
              x={PAD.left + index * stepX}
              y={chartHeight - 12}
              fill={COLORS.grayDark}
              fontSize="9"
              textAnchor="middle"
            >
              {label.slice(0, 8)}
            </SvgText>
          );
        })}
      </Svg>

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
    width: "100%",
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
