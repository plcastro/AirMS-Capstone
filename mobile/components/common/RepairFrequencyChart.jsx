import React from "react";
import AppText from "./AppText";
import {
  View
} from "react-native";
import { COLORS } from "../../stylesheets/colors";
import AreaChart from "./AreaChart";

export default function RepairFrequencyChart({ data = [] }) {
  return (
    <View>
      <AreaChart
        data={data}
        height={160}
        series={[{ key: "value", name: "Task Activity", color: "#26866f" }]}
        xKey="label"
      />
      <AppText style={{ color: COLORS.grayDark, fontSize: 11, marginTop: 6 }}>
        Repair frequency trend based on available records.
      </AppText>
    </View>
  );
}
