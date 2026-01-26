import { Text, TouchableOpacity, View } from "react-native";
import React, { useState } from "react";
import Checkbox from "expo-checkbox";

export default function CheckBox(props) {
  const { title, isChecked = false, onValueChange, checkboxStyle } = props;
  const [checked, setChecked] = useState(isChecked);

  const toggleCheckbox = () => {
    const newValue = !checked;
    setChecked(newValue);
    // console.log("Checkbox checked?", newValue);

    if (onValueChange) onValueChange(newValue);
  };

  return (
    <TouchableOpacity
      style={checkboxStyle}
      onPress={toggleCheckbox}
      activeOpacity={0.8}
    >
      <Checkbox value={checked} onValueChange={toggleCheckbox} />
      <Text style={{ marginLeft: 8 }}>{title}</Text>
    </TouchableOpacity>
  );
}
