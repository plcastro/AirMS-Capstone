import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { COLORS } from "../../stylesheets/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function PostInspectionModalStation2({
  formData,
  updateForm,
  isEditable = true,
}) {
  const [station2SelectAll, setStation2SelectAll] = useState(false);

  const station2Items = [
    {
      key: "station2_frontDoorJettison",
      title: "Front door jettison system",
      checks: [
        {
          subKey: "condition",
          label: "Condition, no crack on external jettison lever",
        },
      ],
    },
    {
      key: "station2_leftCabinAccess",
      title: "Left cabin access doors",
      checks: [
        {
          subKey: "condition",
          label: "Condition, security, locking, no abnormal freeplay",
        },
      ],
    },
    {
      key: "station2_landingGear",
      title: "Landing gear",
      checks: [
        {
          subKey: "condition",
          label:
            "Condition of crosstubes, skids, wear resistant plates, footstep attachment",
        },
      ],
    },
    {
      key: "station2_staticPressure",
      title: "Static pressure points",
      checks: [
        {
          subKey: "condition",
          label: "Condition, blanking removed or fitted as necessary",
        },
      ],
    },
    {
      key: "station2_oatProbe",
      title: "OAT probe",
      checks: [{ subKey: "condition", label: "Condition, attachment" }],
    },
    {
      key: "station2_antennas",
      title: "Antennas under belly",
      checks: [{ subKey: "condition", label: "Condition" }],
    },
    {
      key: "station2_lights",
      title: "Landing and taxiing lights",
      checks: [{ subKey: "condition", label: "Condition" }],
    },
    {
      key: "station2_lowerCowlings",
      title: "Lower cowlings",
      checks: [{ subKey: "condition", label: "Condition, security" }],
    },
    {
      key: "station2_leftCargoDoorOpen",
      title: "Left cargo door",
      checks: [
        {
          subKey: "opening",
          label: "Opening, condition, attachment points, no abnormal freeplay",
        },
      ],
    },
    {
      key: "station2_leftCargoDoorClosed",
      title: "Left cargo door",
      checks: [{ subKey: "closed", label: "Closed and secured" }],
    },
    {
      key: "station2_fuelTank",
      title: "Fuel tank",
      checks: [
        {
          subKey: "condition",
          label:
            "Filler plug closed - Tank sump drained (before first flight of the day and any aircraft displacement)",
        },
      ],
    },
    {
      key: "station2_rearCargoDoorOpen",
      title: "Rear cargo door",
      checks: [
        {
          subKey: "opening",
          label: "Opening, condition, attachment points, no abnormal freeplay",
        },
      ],
    },
    {
      key: "station2_rearCargoBay",
      title: "Rear cargo bay",
      checks: [{ subKey: "harness", label: "Harness condition" }],
    },
    {
      key: "station2_elt",
      title: "ELT",
      checks: [
        {
          subKey: "condition",
          label: 'Condition, security, "ARM" or "OFF" as necessary',
        },
      ],
    },
    {
      key: "station2_rearCargoDoorClosed",
      title: "Rear cargo door",
      checks: [{ subKey: "closed", label: "Closed and secured" }],
    },
    {
      key: "station2_mgbCowlings",
      title: "LH side MGB and engine cowlings",
      checks: [
        {
          subKey: "opening",
          label: "Opening, condition of locking devices, no abnormal freeplay",
        },
      ],
    },
    {
      key: "station2_upperCowling",
      title: "Upper cowling",
      checks: [{ subKey: "security", label: "Security" }],
    },
    {
      key: "station2_mgb",
      title: "MGB",
      checks: [
        { subKey: "condition", label: "Condition, oil levels, no leaks" },
      ],
    },
    {
      key: "station2_transmissionDeck",
      title: "Transmission deck",
      checks: [{ subKey: "cleanliness", label: "Cleanliness" }],
    },
    {
      key: "station2_mgbSupportBars",
      title: "MGB support bars",
      checks: [{ subKey: "condition", label: "Condition, security" }],
    },
    {
      key: "station2_hydraulicSystem",
      title: "Hydraulic system",
      checks: [
        {
          subKey: "condition",
          label: "Condition, attachment points, pipes, no leaks",
        },
      ],
    },
    {
      key: "station2_servos",
      title: "Servos",
      checks: [{ subKey: "security", label: "Security, no leaks or cracks" }],
    },
    {
      key: "station2_coolingFan",
      title: "Cooling fan",
      checks: [
        { subKey: "condition", label: "Motor security, blade condition" },
      ],
    },
    {
      key: "station2_gimbalRing",
      title: "Gimbal ring assembly",
      checks: [
        { subKey: "fitting", label: "Fitting, safety pin set and locked" },
      ],
    },
    {
      key: "station2_electricalHarnesses",
      title: "Electrical harnesses",
      checks: [{ subKey: "condition", label: "Condition, security" }],
    },
    {
      key: "station2_fuelShutoff",
      title: "Fuel shut-off valve",
      checks: [{ subKey: "condition", label: "Condition, security" }],
    },
    {
      key: "station2_mgbCowlingLH",
      title: "MGB cowling (LH side)",
      checks: [{ subKey: "safety", label: "Closed and secured" }],
    },
  ];

  const handleStation2SelectAll = () => {
    const newValue = !station2SelectAll;
    setStation2SelectAll(newValue);
    station2Items.forEach((item) => {
      item.checks.forEach((check) => {
        updateForm(`${item.key}_${check.subKey}`, newValue);
      });
    });
  };

  const handleCheck = (itemKey, subKey) => {
    const fieldKey = `${itemKey}_${subKey}`;
    const currentValue = formData[fieldKey] || false;
    updateForm(fieldKey, !currentValue);

    // Update select all state
    let allChecked = true;
    station2Items.forEach((item) => {
      item.checks.forEach((check) => {
        const checkFieldKey = `${item.key}_${check.subKey}`;
        if (!formData[checkFieldKey] && checkFieldKey !== fieldKey) {
          allChecked = false;
        }
        if (checkFieldKey === fieldKey && !currentValue) {
          // This one is becoming true
        } else if (checkFieldKey === fieldKey && currentValue) {
          allChecked = false;
        }
      });
    });

    if (!currentValue) {
      let allNowChecked = true;
      station2Items.forEach((item) => {
        item.checks.forEach((check) => {
          const checkFieldKey = `${item.key}_${check.subKey}`;
          if (!formData[checkFieldKey] && checkFieldKey !== fieldKey) {
            allNowChecked = false;
          }
          if (checkFieldKey === fieldKey && !currentValue) {
            // This one is becoming true
          } else if (checkFieldKey === fieldKey && currentValue) {
            allNowChecked = false;
          }
        });
      });
      setStation2SelectAll(allNowChecked);
    } else {
      setStation2SelectAll(false);
    }
  };

  const renderItemWithChecks = (index, item) => {
    return (
      <View key={item.key} style={{ marginBottom: 20 }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: "bold",
            color: COLORS.black,
            marginBottom: 10,
          }}
        >
          {index + 1}. {item.title}
        </Text>

        {item.checks.map((check) => {
          const fieldKey = `${item.key}_${check.subKey}`;
          const value = formData[fieldKey] || false;

          return (
            <TouchableOpacity
              key={check.subKey}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginLeft: 16,
                marginBottom: 10,
                paddingRight: 8,
              }}
              onPress={
                isEditable ? () => handleCheck(item.key, check.subKey) : null
              }
              activeOpacity={0.7}
            >
              <View
                style={{
                  width: 20, // Matched to UI standard
                  height: 20, // Matched to UI standard
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: COLORS.primaryLight, // Matched to always be primaryLight
                  backgroundColor: value ? COLORS.primaryLight : "transparent",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}
              >
                {value && (
                  <MaterialCommunityIcons
                    name="check"
                    size={14}
                    color={COLORS.white}
                  />
                )}
              </View>
              <Text
                style={{
                  fontSize: 12, // Matched to UI standard
                  color: COLORS.grayDark,
                  flex: 1,
                  flexWrap: "wrap",
                }}
              >
                {check.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <View>
      {/* Station 2 Card */}
      <View
        style={{
          backgroundColor: COLORS.white,
          borderRadius: 8,
          marginBottom: 24,
          elevation: 4,
          shadowColor: COLORS.black,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
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
          <Text
            style={{ fontSize: 14, fontWeight: "600", color: COLORS.white }}
          >
            Station 2
          </Text>
        </View>

        {isEditable && (
          <View
            style={{
              borderBottomWidth: 1,
              borderBottomColor: COLORS.grayMedium,
              paddingVertical: 14,
              paddingHorizontal: 16,
            }}
          >
            <TouchableOpacity
              onPress={handleStation2SelectAll}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <View
                style={{
                  width: 20, // Matched to UI standard
                  height: 20, // Matched to UI standard
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: COLORS.primaryLight, // Matched to always be primaryLight
                  backgroundColor: station2SelectAll
                    ? COLORS.primaryLight
                    : "transparent",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}
              >
                {station2SelectAll && (
                  <MaterialCommunityIcons
                    name="check"
                    size={14}
                    color={COLORS.white}
                  />
                )}
              </View>
              <Text
                style={{ color: COLORS.black, fontSize: 12, fontWeight: "500" }}
              >
                Select All
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View
          style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}
        >
          {station2Items.map((item, index) =>
            renderItemWithChecks(index, item),
          )}
        </View>
      </View>
    </View>
  );
}
