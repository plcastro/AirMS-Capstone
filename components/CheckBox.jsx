import { Text, TouchableOpacity, View } from "react-native";
import React from "react";
import Checkbox from "expo-checkbox";

export default function CheckBox({
  title,
  value,
  onValueChange,
  checkboxStyle,
  disabled = false,
  textStyle = {},
  checkboxColor,
}) {
  return (
    <TouchableOpacity
      style={[{ flexDirection: "row", alignItems: "center" }, checkboxStyle]}
      onPress={() => !disabled && onValueChange(!value)}
      activeOpacity={disabled ? 1 : 0.8}
      disabled={disabled}
    >
      <Checkbox 
        value={value} 
        onValueChange={() => !disabled && onValueChange(!value)}
        disabled={disabled}
        color={checkboxColor}
      />
      <Text style={[{ marginLeft: 8 }, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
}