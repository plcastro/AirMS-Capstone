import { Text, TouchableOpacity, View } from "react-native";
import React from "react";
import Icon from "react-native-vector-icons/Entypo";

export default function Button(props) {
  const {
    onPress,
    label,
    buttonStyle,
    buttonTextStyle,
    iconName,
    iconSize = 16,
    iconColor = "#fff",
    iconPosition = "left",
  } = props;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        buttonStyle,
        { flexDirection: "row", alignItems: "center", gap: 6 },
      ]}
    >
      {iconName && iconPosition === "left" && (
        <Icon name={iconName} size={iconSize} color={iconColor} />
      )}

      {label && <Text style={buttonTextStyle}>{label}</Text>}

      {iconName && iconPosition === "right" && (
        <Icon name={iconName} size={iconSize} color={iconColor} />
      )}
    </TouchableOpacity>
  );
}
