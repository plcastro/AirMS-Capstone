import React from "react";
import { View, Text, ScrollView } from "react-native";
import { COLORS } from "../../stylesheets/colors";

export default function FlightLogModalToDate({
  componentData,
}) {
  const renderReadOnlyField = (label, value) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 12, color: COLORS.black, marginBottom: 4, fontWeight: "500" }}>
        {label}
      </Text>
      <View
        style={{
          backgroundColor: "#E8E8E8",
          borderRadius: 4,
          height: 38,
          paddingHorizontal: 10,
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 12, color: COLORS.grayDark }}>{value || ""}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View
        style={{
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
          marginBottom: 20,
        }}
      >
        <View
          style={{
            backgroundColor: COLORS.primaryLight,
            paddingVertical: 14,
            paddingHorizontal: 16,
          }}
        >
          <Text style={{ fontSize: 14, color: COLORS.white, fontWeight: "600"}}>
            To Date
          </Text>
        </View>

        <View style={{ padding: 20 }}>
          {renderReadOnlyField("Airframe", componentData.airframe)}
          {renderReadOnlyField("Gear Box Main", componentData.gearBoxMain)}
          {renderReadOnlyField("Gear Box Tail", componentData.gearBoxTail)}
          {renderReadOnlyField("Rotor Main", componentData.rotorMain)}
          {renderReadOnlyField("Rotor Tail", componentData.rotorTail)}
          {renderReadOnlyField("Engine", componentData.engine)}
          {renderReadOnlyField("Cycle N1", componentData.cycleN1)}
          {renderReadOnlyField("Cycle N2", componentData.cycleN2)}
          {renderReadOnlyField("Usage", componentData.usage)}
          {renderReadOnlyField("Landing Cycle", componentData.landingCycle)}
          {renderReadOnlyField("Aircraft Insp. Next Due At", componentData.airframeNextInsp)}
          {renderReadOnlyField("Engine Insp. Next Due At", componentData.engineNextInsp)}
        </View>
      </View>
    </ScrollView>
  );
}
