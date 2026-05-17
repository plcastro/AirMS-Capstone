import React from "react";
import { View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { Text } from "react-native";
import { COLORS } from "../../stylesheets/colors";

const buildPath = (points, height) => {
  if (!points.length) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${height - point.y}`)
    .join(" ");
};

export default function AreaChart({ data = [], height = 140 }) {
  const width = 300;
  const safeData = data.slice(0, 8);

  if (!safeData.length) {
    return <Text style={{ color: COLORS.grayDark, fontSize: 12 }}>No chart data</Text>;
  }

  const maxValue = Math.max(...safeData.map((item) => Number(item.value) || 0), 1);
  const stepX = safeData.length > 1 ? width / (safeData.length - 1) : width;

  const points = safeData.map((item, index) => ({
    x: Math.round(index * stepX),
    y: Math.round(((Number(item.value) || 0) / maxValue) * (height - 20)),
  }));

  const linePath = buildPath(points, height);
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={COLORS.primaryLight} stopOpacity="0.45" />
            <Stop offset="1" stopColor={COLORS.primaryLight} stopOpacity="0.05" />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#areaFill)" />
        <Path d={linePath} stroke={COLORS.primaryLight} strokeWidth="2.5" fill="none" />
      </Svg>
    </View>
  );
}
