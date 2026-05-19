import React from "react";
import { View, Text } from "react-native";
import { COLORS } from "../../stylesheets/colors";
import AreaChart from "./AreaChart";

export default function RepairFrequencyChart({ data = [] }) {
  return (
    <View>
      <AreaChart data={data} height={130} />
      <Text style={{ color: COLORS.grayDark, fontSize: 11, marginTop: 6 }}>
        Repair frequency trend based on available records.
      </Text>
    </View>
  );
}
