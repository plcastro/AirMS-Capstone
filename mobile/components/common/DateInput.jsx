import React, { useState } from "react";
import { TouchableOpacity, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AppText from "./AppText";
import { COLORS } from "../../stylesheets/colors";

export const formatDateInputValue = (value) => {
  if (!value) return "";

  const parsed = parseDateInputValue(value);
  if (!parsed) return "";

  return parsed.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
};

export const parseDateInputValue = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const stringValue = String(value || "").trim();
  if (!stringValue) return null;

  const slashParts = stringValue.split("/");
  if (slashParts.length === 3) {
    const parsed = new Date(
      Number(slashParts[2]),
      Number(slashParts[0]) - 1,
      Number(slashParts[1]),
    );
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const parsed = new Date(stringValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export default function DateInput({
  value,
  onChange,
  onChangeText,
  placeholder = "Select date",
  editable = true,
  style,
  textStyle,
  iconColor,
  minimumDate,
  maximumDate,
}) {
  const [showPicker, setShowPicker] = useState(false);
  const displayValue = formatDateInputValue(value);
  const selectedDate = parseDateInputValue(value) || new Date();
  const disabled = !editable;

  const handleChange = (event, selected) => {
    setShowPicker(false);
    if (event?.type === "dismissed" || !selected) return;

    const formatted = formatDateInputValue(selected);
    onChange?.(formatted, selected);
    onChangeText?.(formatted);
  };

  return (
    <View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        activeOpacity={disabled ? 1 : 0.78}
        disabled={disabled}
        onPress={() => setShowPicker(true)}
        style={[
          {
            minHeight: 42,
            paddingHorizontal: 12,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: COLORS.grayMedium,
            backgroundColor: disabled ? "#E8E8E8" : "#F8F8F8",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          },
          style,
        ]}
      >
        <AppText
          numberOfLines={1}
          style={[
            {
              flex: 1,
              marginRight: 8,
              fontSize: 12,
              color: displayValue ? COLORS.black : COLORS.grayDark,
            },
            textStyle,
          ]}
        >
          {displayValue || placeholder}
        </AppText>
        <MaterialCommunityIcons
          name="calendar-blank"
          size={18}
          color={iconColor || COLORS.grayDark}
        />
      </TouchableOpacity>

      {showPicker && !disabled && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handleChange}
        />
      )}
    </View>
  );
}
