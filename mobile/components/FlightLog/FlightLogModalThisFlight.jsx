import React, { useState } from "react";
import {
  FLIGHT_HOUR_FIELDS,
  normalizeAdditionalLandings,
} from "../../../shared/flightLogTimes";
import AppText from "../common/AppText";
import AppInput from "../common/AppInput";
import { View, ScrollView, TouchableOpacity } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../stylesheets/colors";
import { HOUR_FIELDS } from "../../../shared/flightAutomaticInputs";

export default function FlightLogModalThisFlight({
  componentData,
  onUpdateComponent,
  isEditable = true,
  legCount = 0,
  additionalLandings = 0,
  onAdditionalLandingsChange,
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
        <AppText
          style={{
            fontSize: 12,
            color: COLORS.black,
            marginBottom: 4,
            fontWeight: "500",
          }}
        >
          {label}
        </AppText>
        {field === "landingCycle" ? (
          <View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {[-1, 1].map((delta) => {
                const disabled =
                  !isEditable ||
                  !onAdditionalLandingsChange ||
                  (delta < 0 &&
                    normalizeAdditionalLandings(additionalLandings) === 0);
                return (
                  <React.Fragment key={delta}>
                    {delta === 1 && (
                      <AppText
                        accessibilityLabel="This flight landing cycles"
                        style={{ paddingHorizontal: 16 }}
                      >
                        {componentData[field]}
                      </AppText>
                    )}
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={
                        delta < 0
                          ? "Decrease landing cycles"
                          : "Increase landing cycles"
                      }
                      accessibilityState={{ disabled }}
                      disabled={disabled}
                      onPress={() =>
                        onAdditionalLandingsChange(
                          normalizeAdditionalLandings(additionalLandings) +
                            delta,
                        )
                      }
                      style={{
                        paddingHorizontal: 18,
                        paddingVertical: 12,
                        borderRadius: 6,
                        backgroundColor: disabled ? "#eee" : "#dcefe7",
                      }}
                    >
                      <AppText>{delta < 0 ? "−" : "+"}</AppText>
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })}
            </View>
            <AppText style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
              Minimum: {legCount} (one per leg)
            </AppText>
          </View>
        ) : isNextDueDateField ? (
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
              <AppText
                style={{
                  fontSize: 12,
                  color: componentData[field] ? COLORS.black : COLORS.grayDark,
                }}
              >
                {componentData[field] || "Select date"}
              </AppText>
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
          <AppInput
            style={{
              backgroundColor: isEditable ? "#F2F2F2" : "#E8E8E8",
              borderRadius: 4,
              height: 38,
              paddingHorizontal: 10,
              fontSize: 12,
              color: isEditable ? COLORS.black : COLORS.grayDark,
            }}
            value={componentData[field] || ""}
            onChangeText={(text) =>
              isEditable && onUpdateComponent(field, text)
            }
            editable={isEditable && !FLIGHT_HOUR_FIELDS.includes(field)}
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
          <AppText
            style={{ fontSize: 14, color: COLORS.white, fontWeight: "600" }}
          >
            This Flight
          </AppText>
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
