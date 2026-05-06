import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { COLORS } from "../../stylesheets/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function PostInspectionModalStation1({
  formData,
  updateForm,
  isEditable = true,
}) {
  const [station1SelectAll, setStation1SelectAll] = useState(false);

  const station1Items = [
    {
      key: "station1_transparentPanels",
      title: "Transparent Panels",
      checks: [
        { subKey: "condition", label: "Condition, no cracks, cleanliness" },
        { subKey: "clean", label: "Clean if necessary" },
      ],
    },
    {
      key: "station1_doorsPillars",
      title: "Doors pillars",
      checks: [{ subKey: "condition", label: "Condition, no crack" }],
    },
    {
      key: "station1_sideSlipIndicator",
      title: "Side slip indicator",
      checks: [
        {
          subKey: "condition",
          label: "Condition, blanking cap removed or fitted as necessary",
        },
      ],
    },
    {
      key: "station1_sideSlipIndicator2",
      title: "Side slip indicator",
      checks: [{ subKey: "condition", label: "Condition" }],
    },
    {
      key: "station1_mgbEngineOilCooler",
      title: "MGB - Engine oil cooler inlet",
      checks: [
        {
          subKey: "condition",
          label:
            "Condition, no obstruction or debris, blanking removed or fitted as necessary",
        },
      ],
    },
  ];

  const handleStation1SelectAll = () => {
    const newValue = !station1SelectAll;
    setStation1SelectAll(newValue);
    station1Items.forEach((item) => {
      item.checks.forEach((check) => {
        updateForm(`${item.key}_${check.subKey}`, newValue);
      });
    });
  };

  const handleCheck = (itemKey, subKey) => {
    const fieldKey = `${itemKey}_${subKey}`;
    const currentValue = formData[fieldKey] || false;
    updateForm(fieldKey, !currentValue);

    // Check if all items are checked
    let allChecked = true;
    station1Items.forEach((item) => {
      item.checks.forEach((check) => {
        const checkFieldKey = `${item.key}_${check.subKey}`;
        if (!formData[checkFieldKey] && checkFieldKey !== fieldKey) {
          allChecked = false;
        }
        if (checkFieldKey === fieldKey && !currentValue) {
          // This one is becoming true, keep checking others
        } else if (checkFieldKey === fieldKey && currentValue) {
          // This one is becoming false
          allChecked = false;
        }
      });
    });

    // Re-check after update
    if (!currentValue) {
      let allNowChecked = true;
      station1Items.forEach((item) => {
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
      setStation1SelectAll(allNowChecked);
    } else {
      setStation1SelectAll(false);
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

        {item.checks.map((check, checkIndex) => {
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
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: COLORS.primaryLight,
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
                  fontSize: 12,
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
      {/* Station 1 Card */}
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
            Station 1
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
              onPress={handleStation1SelectAll}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: COLORS.primaryLight,
                  backgroundColor: station1SelectAll
                    ? COLORS.primaryLight
                    : "transparent",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}
              >
                {station1SelectAll && (
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
          {station1Items.map((item, index) =>
            renderItemWithChecks(index, item),
          )}
        </View>
      </View>
    </View>
  );
}
