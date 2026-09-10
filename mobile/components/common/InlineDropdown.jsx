import React from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AppText from "./AppText";
import { COLORS } from "../../stylesheets/colors";

export default function InlineDropdown({
  value,
  options = [],
  placeholder = "Select an option",
  open,
  onToggle,
  onChange,
  menuMaxHeight = 220,
}) {
  const selected = options.find((option) => String(option.value) === String(value));

  return (
    <View style={{ position: "relative", zIndex: open ? 1000 : 1 }}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={{
          minHeight: 48,
          paddingHorizontal: 12,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: COLORS.border || "#d1d5db",
          backgroundColor: "#F1F1F1",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <AppText
          numberOfLines={1}
          style={{
            color: selected ? COLORS.black : COLORS.grayDark,
            fontSize: 12,
            flex: 1,
            marginRight: 6,
          }}
        >
          {selected?.label || placeholder}
        </AppText>
        <MaterialCommunityIcons
          name={open ? "chevron-up" : "chevron-down"}
          size={22}
          color={COLORS.grayDark}
        />
      </TouchableOpacity>
      {open && (
        <ScrollView
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          style={{
            position: "absolute",
            top: 52,
            left: 0,
            right: 0,
            maxHeight: menuMaxHeight,
            borderWidth: 1,
            borderColor: COLORS.border || "#d1d5db",
            borderRadius: 8,
            backgroundColor: COLORS.white,
            overflow: "hidden",
            elevation: 12,
            zIndex: 1000,
          }}
          contentContainerStyle={{ flexGrow: 0 }}
        >
          {options.map((option) => (
            <TouchableOpacity
              key={String(option.value)}
              onPress={() => onChange?.(option.value)}
              style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#EEEEEE" }}
            >
              <AppText style={{ color: COLORS.black, fontSize: 12 }}>{option.label}</AppText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
