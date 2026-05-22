import React from "react";
import AppText from "./common/AppText";
import {
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
  disabled = false, // add disabled prop
}) {
  return (
    <TouchableOpacity
      onPress={disabled ? null : onPress} // prevent press if disabled
      activeOpacity={disabled ? 1 : 0.7} // optional visual feedback
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.5 : 1, // dim button if disabled
        },
        buttonStyle,
      ]}
    >
      {iconName && (
        <Icon
          name={iconName}
          size={16}
          color={buttonTextStyle.color || "#fff"}
          style={[{ marginRight: 4 }, iconStyle]}
        />
      )}
      <AppText style={[{ textAlign: "center" }, buttonTextStyle]}>{label}</AppText>
    </TouchableOpacity>
  );
}
