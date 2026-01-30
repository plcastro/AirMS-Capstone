import { Text, TouchableOpacity } from "react-native";
import React from "react";

export default function Button(props) {
  const { use, label, buttonStyle, buttonTextStyle } = props;

  return (
    <>
      <TouchableOpacity onPress={use} style={buttonStyle}>
        <Text style={buttonTextStyle}>{label}</Text>
      </TouchableOpacity>
    </>
  );
}
