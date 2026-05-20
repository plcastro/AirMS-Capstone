import React from "react";
import AppText from "./AppText";
import {
  View
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { COLORS } from "../../stylesheets/colors";

const palette = ["#26866F", "#1890ff", "#faad14", "#cf1322", "#722ed1", "#13c2c2"];

export default function PieChart({ data = [], size = 160 }) {
  const radius = size / 2 - 16;
  const center = size / 2;
  const strokeWidth = 24;
  const safeData = data.filter((item) => Number(item.value) > 0);
  const total = safeData.reduce((sum, item) => sum + Number(item.value || 0), 0);

  if (!total) {
    return <AppText style={{ color: COLORS.grayDark, fontSize: 12 }}>No chart data</AppText>;
  }

  let cumulative = 0;

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={size} height={size}>
        {safeData.map((item, index) => {
          const value = Number(item.value || 0);
          const angle = (value / total) * 360;
          const dash = (angle / 360) * (2 * Math.PI * radius);
          const gap = 2 * Math.PI * radius - dash;
          const rotation = cumulative - 90;
          cumulative += angle;

          return (
            <Circle
              key={`${item.label || item.name}-${index}`}
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={item.fill || palette[index % palette.length]}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${gap}`}
              strokeLinecap="butt"
              originX={center}
              originY={center}
              rotation={rotation}
            />
          );
        })}
      </Svg>
      <AppText style={{ marginTop: -10, color: COLORS.grayDark, fontSize: 12 }}>{`Total: ${total}`}</AppText>
    </View>
  );
}

export const SDMChart = PieChart;
