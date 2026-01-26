import { Text, TouchableOpacity } from "react-native";
import React from "react";

export default function Button(props) {
  const { use, title, buttonStyle, buttonTextStyle } = props;

  return (
    <>
      <TouchableOpacity onPress={use} style={buttonStyle}>
        <Text style={buttonTextStyle}>{title}</Text>
      </TouchableOpacity>
    </>
  );
}
