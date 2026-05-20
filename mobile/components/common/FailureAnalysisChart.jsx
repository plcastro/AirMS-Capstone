import React from "react";
import AppText from "./AppText";
import {
  View
} from "react-native";
import { COLORS } from "../../stylesheets/colors";

export default function FailureAnalysisChart({ rows = [] }) {
  const safeRows = rows.slice(0, 6);
  const maxValue = Math.max(...safeRows.map((row) => Number(row.value) || 0), 1);

  if (!safeRows.length) {
    return <AppText style={{ color: COLORS.grayDark, fontSize: 12 }}>No chart data</AppText>;
  }

  return (
    <View style={{ marginTop: 6 }}>
      {safeRows.map((row) => {
        const value = Number(row.value) || 0;
        const widthPct = Math.max((value / maxValue) * 100, 2);
        return (
          <View key={row.label} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <AppText style={{ color: COLORS.black, fontSize: 12 }}>{row.label}</AppText>
              <AppText style={{ color: COLORS.grayDark, fontSize: 12 }}>{value}</AppText>
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
