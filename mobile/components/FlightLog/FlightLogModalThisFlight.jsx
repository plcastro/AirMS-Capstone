import React, { useState } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../stylesheets/colors";

export default function FlightLogModalThisFlight({
  componentData,
  onUpdateComponent,
  isEditable = true,
}) {
  const [activeDateField, setActiveDateField] = useState(null);

  const formatDate = (date) =>
    date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });

  const parseDate = (value) => {
    if (!value) return new Date();
    if (value instanceof Date) return value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  const renderField = (label, field) => {
    const isNextDueDateField =
      field === "airframeNextInsp" || field === "engineNextInsp";

    return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 12, color: COLORS.black, marginBottom: 4, fontWeight: "500" }}>
        {label}
      </Text>
      {isNextDueDateField ? (
        <>
          <TouchableOpacity
            onPress={() => isEditable && setActiveDateField(field)}
            disabled={!isEditable}
            style={{
              backgroundColor: isEditable ? "#F2F2F2" : "#E8E8E8",
              borderRadius: 4,
              height: 38,
              paddingHorizontal: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: componentData[field] ? COLORS.black : COLORS.grayDark,
              }}
            >
              {componentData[field] || "Select date"}
            </Text>
            <MaterialCommunityIcons
              name="calendar-blank"
              size={18}
              color={COLORS.grayDark}
            />
          </TouchableOpacity>
          {activeDateField === field && (
            <DateTimePicker
              value={parseDate(componentData[field])}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setActiveDateField(null);
                if (event.type === "dismissed" || !selectedDate) return;
                onUpdateComponent(field, formatDate(selectedDate));
              }}
            />
          )}
        </>
      ) : (
        <TextInput
          style={{
            backgroundColor: isEditable ? "#F2F2F2" : "#E8E8E8",
            borderRadius: 4,
            height: 38,
            paddingHorizontal: 10,
            fontSize: 12,
            color: isEditable ? COLORS.black : COLORS.grayDark,
          }}
          value={componentData[field] || ""}
          onChangeText={(text) => isEditable && onUpdateComponent(field, text)}
          editable={isEditable}
          keyboardType="numeric"
        />
      )}
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
            This Flight
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
