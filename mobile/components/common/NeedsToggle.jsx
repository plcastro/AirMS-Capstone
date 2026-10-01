import React from "react";
import { TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AppText from "./AppText";
import { COLORS } from "../../stylesheets/colors";

// Same pill as "Needs My Action" on flight logs, with its own label.
export default function NeedsToggle({ label, value, onToggle }) {
  return (
    <TouchableOpacity
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      onPress={onToggle}
      style={{
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        backgroundColor: value ? `${COLORS.primaryLight}1A` : COLORS.white,
        borderWidth: 1,
        borderColor: value ? COLORS.primaryLight : COLORS.grayMedium,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 10,
      }}
    >
      <MaterialCommunityIcons
        name={value ? "checkbox-marked" : "checkbox-blank-outline"}
        size={16}
        color={value ? COLORS.primaryLight : COLORS.grayDark}
      />
      <AppText
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: value ? COLORS.primaryLight : COLORS.grayDark,
          marginLeft: 6,
        }}
      >
        {label}
      </AppText>
    </TouchableOpacity>
  );
}
