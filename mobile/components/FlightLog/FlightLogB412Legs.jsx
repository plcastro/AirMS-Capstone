import React from "react";
import { View } from "react-native";
import AppInput from "../common/AppInput";
import AppText from "../common/AppText";
import { COLORS } from "../../stylesheets/colors";

const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th"];

function Field({ label, value, onChangeText, isEditable }) {
  return (
    <View style={{ flex: 1, minWidth: 130, marginBottom: 14 }}>
      <AppText
        style={{
          fontSize: 12,
          color: COLORS.black,
          marginBottom: 5,
          fontWeight: "500",
        }}
      >
        {label}
      </AppText>
      <AppInput
        value={value || ""}
        onChangeText={onChangeText}
        editable={isEditable}
        style={{
          backgroundColor: isEditable ? "#F2F2F2" : "#E8E8E8",
          borderRadius: 4,
          height: 38,
          paddingHorizontal: 10,
          fontSize: 12,
          color: isEditable ? COLORS.black : COLORS.grayDark,
        }}
      />
    </View>
  );
}

export default function FlightLogB412Legs({
  legs = [],
  onUpdateLegs,
  isEditable = true,
}) {
  const updateLeg = (legIndex, field, value) => {
    if (!isEditable) return;

    const nextLegs = legs.map((leg, index) =>
      index === legIndex ? { ...leg, [field]: value } : leg,
    );
    onUpdateLegs(nextLegs);
  };

  const updateStation = (legIndex, field, value) => {
    if (!isEditable) return;

    const nextLegs = legs.map((leg, index) => {
      if (index !== legIndex) return leg;

      const firstStation = leg?.stations?.[0] || { from: "", to: "" };
      return {
        ...leg,
        stations: [{ ...firstStation, [field]: value }],
      };
    });
    onUpdateLegs(nextLegs);
  };

  return (
    <View>
      <AppText
        style={{
          fontSize: 14,
          fontWeight: "600",
          color: COLORS.grayDark,
          marginBottom: 16,
        }}
      >
        Flight Legs
      </AppText>

      {legs.map((leg, legIndex) => (
        <View
          key={ORDINALS[legIndex] || legIndex}
          style={{
            backgroundColor: COLORS.white,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: COLORS.grayMedium,
            marginBottom: 18,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              backgroundColor: COLORS.primaryLight,
              paddingVertical: 12,
              paddingHorizontal: 16,
            }}
          >
            <AppText
              style={{ color: COLORS.white, fontSize: 14, fontWeight: "600" }}
            >
              {ORDINALS[legIndex]} Leg
            </AppText>
          </View>

          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Field
                label="Station From"
                value={leg?.stations?.[0]?.from}
                onChangeText={(value) =>
                  updateStation(legIndex, "from", value)
                }
                isEditable={isEditable}
              />
              <Field
                label="Station To"
                value={leg?.stations?.[0]?.to}
                onChangeText={(value) => updateStation(legIndex, "to", value)}
                isEditable={isEditable}
              />
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Field
                label="Block Time — On"
                value={leg.blockTimeOn}
                onChangeText={(value) =>
                  updateLeg(legIndex, "blockTimeOn", value)
                }
                isEditable={isEditable}
              />
              <Field
                label="Block Time — Off"
                value={leg.blockTimeOff}
                onChangeText={(value) =>
                  updateLeg(legIndex, "blockTimeOff", value)
                }
                isEditable={isEditable}
              />
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Field
                label="Flight Time — On"
                value={leg.flightTimeOn}
                onChangeText={(value) =>
                  updateLeg(legIndex, "flightTimeOn", value)
                }
                isEditable={isEditable}
              />
              <Field
                label="Flight Time — Off"
                value={leg.flightTimeOff}
                onChangeText={(value) =>
                  updateLeg(legIndex, "flightTimeOff", value)
                }
                isEditable={isEditable}
              />
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Field
                label="Total Time — Block"
                value={leg.totalTimeOn}
                onChangeText={(value) =>
                  updateLeg(legIndex, "totalTimeOn", value)
                }
                isEditable={isEditable}
              />
              <Field
                label="Total Time — Flight"
                value={leg.totalTimeOff}
                onChangeText={(value) =>
                  updateLeg(legIndex, "totalTimeOff", value)
                }
                isEditable={isEditable}
              />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
