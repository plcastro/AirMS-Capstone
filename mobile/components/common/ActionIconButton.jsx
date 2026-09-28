import React from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import { Tooltip } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function ActionIconButton({
  icon,
  tooltip,
  accessibilityLabel = tooltip,
  onPress,
  disabled = false,
  loading = false,
  color = "#444",
  disabledColor = "#C8C8C8",
  backgroundColor = "transparent",
  borderColor = "transparent",
  size = 36,
  iconSize = 20,
  style,
}) {
  const isDisabled = disabled || loading;
  const button = (
    <TouchableOpacity
      activeOpacity={isDisabled ? 1 : 0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      onPress={isDisabled ? undefined : onPress}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
          borderColor,
          opacity: isDisabled ? 0.55 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <MaterialCommunityIcons
          name={icon}
          size={iconSize}
          color={isDisabled ? disabledColor : color}
        />
      )}
    </TouchableOpacity>
  );

  return tooltip ? <Tooltip title={tooltip}>{button}</Tooltip> : button;
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});
