import { Text, TouchableOpacity } from "react-native";
import React from "react";

export default function Button(props) {
  const { onPress, label, buttonStyle, buttonTextStyle } = props;

  return (
    <>
      <TouchableOpacity onPress={onPress} style={buttonStyle}>
        <Text style={buttonTextStyle}>{label}</Text>
      </TouchableOpacity>
    </>
  );
}
