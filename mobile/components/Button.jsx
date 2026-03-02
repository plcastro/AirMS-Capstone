import React from "react";
import { TouchableOpacity, Text, View } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons"; // adjust to your icon lib

export default function Button({
  iconName,
  label,
  onPress,
  buttonStyle = {},
  buttonTextStyle = {},
  iconStyle = {},
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
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
      <Text style={[{ textAlign: "center" }, buttonTextStyle]}>{label}</Text>
    </TouchableOpacity>
  );
}
