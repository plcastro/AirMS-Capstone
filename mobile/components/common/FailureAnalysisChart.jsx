import React from "react";
import { View, Text } from "react-native";
import { COLORS } from "../../stylesheets/colors";

export default function FailureAnalysisChart({ rows = [] }) {
  const safeRows = rows.slice(0, 6);
  const maxValue = Math.max(...safeRows.map((row) => Number(row.value) || 0), 1);

  if (!safeRows.length) {
    return <Text style={{ color: COLORS.grayDark, fontSize: 12 }}>No chart data</Text>;
  }

  return (
    <View style={{ marginTop: 6 }}>
      {safeRows.map((row) => {
        const value = Number(row.value) || 0;
        const widthPct = Math.max((value / maxValue) * 100, 2);
        return (
          <View key={row.label} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: COLORS.black, fontSize: 12 }}>{row.label}</Text>
              <Text style={{ color: COLORS.grayDark, fontSize: 12 }}>{value}</Text>
            </View>
            <View style={{ height: 8, backgroundColor: "#eaf3f0", borderRadius: 999, marginTop: 4 }}>
              <View style={{ width: `${widthPct}%`, height: 8, backgroundColor: COLORS.primaryLight, borderRadius: 999 }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}
