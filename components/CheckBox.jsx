import { Text, TouchableOpacity, View } from "react-native";
import React from "react";
import Checkbox from "expo-checkbox";

export default function CheckBox({
  title,
  value,
  onValueChange,
  checkboxStyle,
}) {
  return (
    <TouchableOpacity
      style={[{ flexDirection: "row", alignItems: "center" }, checkboxStyle]}
      onPress={() => onValueChange(!value)} // toggle using parent value
      activeOpacity={0.8}
    >
      <Checkbox value={value} onValueChange={() => onValueChange(!value)} />
      <Text style={{ marginLeft: 8 }}>{title}</Text>
    </TouchableOpacity>
  );
}
