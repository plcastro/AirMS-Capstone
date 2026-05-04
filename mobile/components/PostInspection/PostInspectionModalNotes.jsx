import React from "react";
import { View, Text, TextInput } from "react-native";
import { COLORS } from "../../stylesheets/colors";

export default function PostInspectionModalNotes({
  formData,
  updateForm,
  isEditable = true,
}) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.black }}>
        Notes
      </Text>
      <Text style={{ fontSize: 12, color: COLORS.grayDark }}>
        These notes are included in AI maintenance tracking interpretations.
      </Text>
      <TextInput
        value={formData.notes || ""}
        onChangeText={(value) => updateForm("notes", value)}
        editable={isEditable}
        multiline
        textAlignVertical="top"
        placeholder="Enter post-inspection notes, discrepancy signals, or remarks"
        placeholderTextColor={COLORS.grayDark}
        style={{
          minHeight: 160,
          borderWidth: 1,
          borderColor: COLORS.grayMedium,
          borderRadius: 8,
          padding: 12,
          color: COLORS.black,
          backgroundColor: isEditable ? COLORS.white : COLORS.grayLight,
          fontSize: 12,
        }}
      />
    </View>
  );
}
