import React, { useState } from "react";
import AppText from "./common/AppText";
import {
  ActivityIndicator,
  TouchableOpacity,
  View
} from "react-native";
import { MaterialIcons as Icon } from "@expo/vector-icons";

export default function Button({
  iconName,
  label,
  onPress,
  buttonStyle = {},
  buttonTextStyle = {},
  iconStyle = {},
  disabled = false,
  loading = false,
}) {
  const [pressLoading, setPressLoading] = useState(false);
  const isLoading = loading || pressLoading;

  const handlePress = async () => {
    if (disabled || isLoading || typeof onPress !== "function") return;
    const startedAt = Date.now();
    setPressLoading(true);
    try {
      await Promise.resolve(onPress());
    } finally {
      const elapsed = Date.now() - startedAt;
      const minVisibleMs = 250;
      if (elapsed < minVisibleMs) {
        await new Promise((resolve) => setTimeout(resolve, minVisibleMs - elapsed));
      }
      setPressLoading(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={isLoading || disabled ? null : handlePress}
      activeOpacity={isLoading || disabled ? 1 : 0.7}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          opacity: isLoading || disabled ? 0.5 : 1,
        },
        buttonStyle,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={buttonTextStyle.color || "#fff"}
          style={[{ marginRight: 6 }, iconStyle]}
        />
      ) : iconName ? (
        <Icon
          name={iconName}
          size={16}
          color={buttonTextStyle.color || "#fff"}
          style={[{ marginRight: 4 }, iconStyle]}
        />
      ) : null}
      <AppText style={[{ textAlign: "center" }, buttonTextStyle]}>{label}</AppText>
    </TouchableOpacity>
  );
}
