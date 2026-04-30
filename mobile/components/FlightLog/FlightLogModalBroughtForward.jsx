import React from "react";
import { View, Text, TextInput, ScrollView } from "react-native";
import { COLORS } from "../../stylesheets/colors";

export default function FlightLogModalBroughtForward({
  componentData,
  onUpdateComponent,
  isEditable = true,
  isLocked = false,
}) {
  const isFieldEditable = (field) => isEditable && field === "usage";

  const renderField = (label, field) => {
    const editable = isFieldEditable(field);

    return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 12, color: COLORS.black, marginBottom: 4, fontWeight: "500" }}>
        {label}
      </Text>
      <TextInput
        style={{
          backgroundColor: editable ? "#F2F2F2" : "#E8E8E8",
          borderRadius: 4,
          height: 38,
          paddingHorizontal: 10,
          fontSize: 12,
          color: editable ? COLORS.black : COLORS.grayDark,
        }}
        value={componentData[field]?.toString() || ""}
        onChangeText={(text) => editable && onUpdateComponent(field, text)}
        editable={editable}
        keyboardType={field === "airframeNextInsp" || field === "engineNextInsp" ? "default" : "numeric"}
      />
    </View>
    );
  };

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
            Brought Forward
          </Text>
        </View>

        <View style={{ padding: 20 }}>
          {renderField("Airframe", "airframe")}
          {renderField("Gear Box Main", "gearBoxMain")}
          {renderField("Gear Box Tail", "gearBoxTail")}
          {renderField("Rotor Main", "rotorMain")}
          {renderField("Rotor Tail", "rotorTail")}
          {renderField("Engine", "engine")}
          {renderField("Cycle N1", "cycleN1")}
          {renderField("Cycle N2", "cycleN2")}
          {renderField("Usage", "usage")}
          {renderField("Landing Cycle", "landingCycle")}
          {renderField("Aircraft Insp. Next Due At", "airframeNextInsp")}
          {renderField("Engine Insp. Next Due At", "engineNextInsp")}
        </View>
      </View>
    </ScrollView>
  );
}
