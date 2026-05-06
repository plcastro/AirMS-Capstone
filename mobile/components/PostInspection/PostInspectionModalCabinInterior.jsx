import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { COLORS } from "../../stylesheets/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function PostInspectionModalCabinInterior({
  formData,
  updateForm,
  isEditable = true,
}) {
  const [cabinSelectAll, setCabinSelectAll] = useState(false);

  const cabinItems = [
    {
      key: "cabin_general",
      title: "Cabin",
      checks: [{ subKey: "cleanliness", label: "General cleanliness" }],
    },
    {
      key: "cabin_seats",
      title: "Seats",
      checks: [{ subKey: "condition", label: "Condition, attachment points" }],
    },
    {
      key: "cabin_doorJettison",
      title: "Door jettison system",
      checks: [
        { subKey: "checked", label: "Checked - Plastic guard condition" },
      ],
    },
    {
      key: "cabin_fireExtinguisher",
      title: "Fire Extinguisher",
      checks: [{ subKey: "condition", label: "Secured - Checked" }],
    },
    {
      key: "cabin_circuitBreakers",
      title: "Circuit Breakers",
      checks: [{ subKey: "set", label: "All set" }],
    },
    {
      key: "cabin_scu",
      title: "SCU",
      checks: [
        { subKey: "position", label: "Check all pushbuttons in OFF position" },
      ],
    },
    {
      key: "cabin_batterySwitchOn",
      title: "Battery Switch",
      checks: [{ subKey: "on", label: "ON, check battery voltage" }],
    },
    {
      key: "cabin_vemd",
      title: "VEMD",
      checks: [
        {
          subKey: "flightReport",
          label:
            "Check flights of the day report pages data (MAIN mode, FLIGHT REPORT page)",
        },
        { subKey: "flightTimes", label: "VEMD flight times" },
        {
          subKey: "cycles",
          label:
            "Ng and Nf cycles: check written in white characters and above 0",
        },
        {
          subKey: "advisoryMessages",
          label: "Check advisory messages of FAILURE or OVERLIMIT DETECTED",
        },
        {
          subKey: "recordData",
          label:
            "Record flights of the day data in aircraft and engine logbooks",
        },
      ],
    },
    {
      key: "cabin_batterySwitchOff",
      title: "Battery Switch",
      checks: [{ subKey: "off", label: "OFF" }],
    },
  ];

  const handleCabinSelectAll = () => {
    const newValue = !cabinSelectAll;
    setCabinSelectAll(newValue);
    cabinItems.forEach((item) => {
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
    cabinItems.forEach((item) => {
      item.checks.forEach((check) => {
        const checkFieldKey = `${item.key}_${check.subKey}`;
        if (!formData[checkFieldKey] && checkFieldKey !== fieldKey) {
          allChecked = false;
        }
      });
    });

    if (!currentValue) {
      let allNowChecked = true;
      cabinItems.forEach((item) => {
        item.checks.forEach((check) => {
          const checkFieldKey = `${item.key}_${check.subKey}`;
          if (!formData[checkFieldKey] && checkFieldKey !== fieldKey) {
            allNowChecked = false;
          }
        });
      });
      setCabinSelectAll(allNowChecked);
    } else {
      setCabinSelectAll(false);
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
      {/* Cabin Interior Card */}
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
            Cabin Interior
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
              onPress={handleCabinSelectAll}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <View
                style={{
                  width: 20, // Matched to UI standard
                  height: 20, // Matched to UI standard
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: COLORS.primaryLight, // Matched to always be primaryLight
                  backgroundColor: cabinSelectAll
                    ? COLORS.primaryLight
                    : "transparent",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}
              >
                {cabinSelectAll && (
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
          {cabinItems.map((item, index) => renderItemWithChecks(index, item))}
        </View>
      </View>
    </View>
  );
}
