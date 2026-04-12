import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { COLORS } from "../../stylesheets/colors";

export default function FlightLogModalComponentTimes({
  currentComponentPage,
  componentData,
  onUpdateComponent,
  isEditable = true,
  isLocked = false,
  aircraftData = null
}) {
  // Define the mapping between component fields and aircraft data fields
  const getAircraftValue = (fieldKey) => {
    if (!aircraftData) return "";
    
    // Map component fields to aircraft data structure
    const fieldMapping = {
      airframe: aircraftData.referenceData.acftTT || "",
      gearBoxMain: aircraftData.referenceData.gbmTT || "",
      gearBoxTail: aircraftData.referenceData.gbtTT || "",
      rotorMain: aircraftData.referenceData.mrbTT || "",
      rotorTail: aircraftData.referenceData.trbTT || "",
      airframeNextInsp: aircraftData.referenceData.acrfNextInsp || "",
      engine: aircraftData.referenceData.engTT || "",
      cycleN1: aircraftData.referenceData.n1Cycles || "",
      cycleN2: aircraftData.referenceData.n2Cycles || "",
      usage: aircraftData.referenceData.usage || "",
      landingCycle: aircraftData.referenceData.landings || "",
      engineNextInsp: aircraftData.referenceData.engNextInsp || "",
    };
    
    return fieldMapping[fieldKey] || "";
  };

  const maintenanceFields = [
    { label: "A/Frame", key: "airframe" },
    { label: "Gear Box (MAIN)", key: "gearBoxMain" },
    { label: "Gear Box (TAIL)", key: "gearBoxTail" },
    { label: "Rotor (MAIN)", key: "rotorMain" },
    { label: "Rotor (TAIL)", key: "rotorTail" },  
    { label: "Airframe Next Insp. Due At", key: "airframeNextInsp" },
    { label: "Engine", key: "engine" },
    { label: "Cycle (N1)", key: "cycleN1" },
    { label: "Cycle (N2)", key: "cycleN2" },
    { label: "Usage", key: "usage" },
    { label: "Landing Cycle", key: "landingCycle" },
    { label: "Engine Next Insp. Due At", key: "engineNextInsp" },
  ];

  const renderField = (label, fieldKey) => {
    const isFieldEditable = isEditable && !isLocked;
    
    // Get value from componentData first, then from aircraftData
    const value = componentData[fieldKey] || getAircraftValue(fieldKey) || "";
    
    return (
      <View style={{ marginBottom: 16 }}>
        <Text
          style={{
            fontSize: 13,
            color: COLORS.black,
            marginBottom: 6,
            fontWeight: "500",
          }}
        >
          {label}
        </Text>
        <TextInput
          style={{
            backgroundColor: isFieldEditable ? "#F2F2F2" : "#E8E8E8",
            borderRadius: 6,
            height: 42,
            paddingHorizontal: 12,
            fontSize: 14,
            color: isFieldEditable ? COLORS.black : COLORS.grayDark,
          }}
          value={value}
          onChangeText={(text) => onUpdateComponent(fieldKey, text)}
          keyboardType="numeric"
          editable={isFieldEditable}
        />
        {isLocked && (
          <Text style={{ fontSize: 10, color: COLORS.grayDark, marginTop: 4 }}>
            This section is locked and cannot be edited
          </Text>
        )}
      </View>
    );
  };

  const getPageTitle = () => {
    if (currentComponentPage === 0) return "Brought Forward";
    if (currentComponentPage === 1) return "This Flight";
    return "To Date";
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          color: COLORS.grayDark,
          marginBottom: 16,
        }}
      >
        Component Times
      </Text>

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
        }}
      >
        <View
          style={{
            backgroundColor: COLORS.primaryLight,
            paddingVertical: 14,
            paddingHorizontal: 16,
          }}
        >
          <Text
            style={{ fontSize: 16, color: COLORS.white, fontWeight: "600" }}
          >
            {getPageTitle()}
            {isLocked && currentComponentPage === 0 && (
              <Text
                style={{ fontSize: 12, color: COLORS.white, marginLeft: 8 }}
              >
                {" "}
                (Locked)
              </Text>
            )}
          </Text>
        </View>

        <View style={{ padding: 20 }}>
          {maintenanceFields.map((field, idx) => (
            <View key={idx}>
              {renderField(field.label, field.key)}
              {idx === 5 && (
                <View
                  style={{
                    height: 1,
                    backgroundColor: COLORS.grayMedium,
                    marginVertical: 16,
                  }}
                />
              )}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
