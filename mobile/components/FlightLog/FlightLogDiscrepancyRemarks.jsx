import React from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
} from "react-native";
import { COLORS } from "../../stylesheets/colors";

export default function FlightLogDiscrepancyRemarks({
  remarks,
  sling,
  onUpdateRemarks,
  onUpdateSling,
  isEditable = true,
}) {
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.grayDark, marginBottom: 16 }}>
        Discrepancy/Remarks
      </Text>

      <View style={{
        backgroundColor: COLORS.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.grayMedium,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
        overflow: "hidden",
      }}>
        <View style={{ backgroundColor: COLORS.primaryLight, paddingVertical: 14, paddingHorizontal: 16 }}>
          <Text style={{ fontSize: 16, color: COLORS.white, fontWeight: "600" }}>
            Discrepancy/Remarks
          </Text>
        </View>

        <View style={{ padding: 20 }}>
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 13, color: COLORS.black, marginBottom: 6, fontWeight: "500" }}>
              Discrepancy/Remarks
            </Text>
            <TextInput
              style={{
                backgroundColor: isEditable ? "#F2F2F2" : "#E8E8E8",
                borderRadius: 6,
                height: 100,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 14,
                color: isEditable ? COLORS.black : COLORS.grayDark,
                textAlignVertical: "top",
              }}
              value={remarks}
              onChangeText={onUpdateRemarks}
              placeholder="Enter any discrepancies or remarks"
              placeholderTextColor={COLORS.grayDark}
              multiline
              numberOfLines={4}
              editable={isEditable}
            />
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, color: COLORS.black, marginBottom: 6, fontWeight: "500" }}>
              Sling
            </Text>
            <TextInput
              style={{
                backgroundColor: isEditable ? "#F2F2F2" : "#E8E8E8",
                borderRadius: 6,
                height: 100,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 14,
                color: isEditable ? COLORS.black : COLORS.grayDark,
                textAlignVertical: "top",
              }}
              value={sling}
              onChangeText={onUpdateSling}
              placeholder="Enter sling information"
              placeholderTextColor={COLORS.grayDark}
              multiline
              numberOfLines={4}
              editable={isEditable}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}