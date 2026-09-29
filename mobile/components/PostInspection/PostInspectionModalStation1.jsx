import React, { useState } from "react";
import AppText from "../common/AppText";
import {
  View,
  TouchableOpacity
} from "react-native";
import { COLORS } from "../../stylesheets/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const ChecklistBox = ({ checked }) => (
  <View
    style={{
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: checked ? COLORS.primaryLight : COLORS.grayMedium,
      backgroundColor: checked ? COLORS.primaryLight : COLORS.white,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    }}
  >
    {checked && (
      <MaterialCommunityIcons name="check-bold" size={14} color={COLORS.white} />
    )}
  </View>
);

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
    const allChecked = item.checks.every(
      (check) => formData[`${item.key}_${check.subKey}`],
    );

    return (
      <View
        key={item.key}
        style={{
          backgroundColor: allChecked ? `${COLORS.primaryLight}12` : COLORS.grayLight,
          borderWidth: 1,
          borderColor: allChecked ? COLORS.primaryLight : COLORS.border,
          borderRadius: 10,
          padding: 12,
          marginBottom: 10,
        }}
      >
        <AppText
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: COLORS.black,
            marginBottom: 8,
          }}
        >
          {index + 1}. {item.title}
        </AppText>

        {item.checks.map((check) => {
          const fieldKey = `${item.key}_${check.subKey}`;
          const value = formData[fieldKey] || false;

          return (
            <TouchableOpacity
              key={check.subKey}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: value }}
              accessibilityLabel={check.label}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                marginBottom: 6,
              }}
              onPress={
                isEditable ? () => handleCheck(item.key, check.subKey) : null
              }
              activeOpacity={0.7}
            >
              <ChecklistBox checked={value} />
              <AppText
                style={{
                  fontSize: 12,
                  lineHeight: 18,
                  color: COLORS.grayDark,
                  flex: 1,
                  flexWrap: "wrap",
                }}
              >
                {check.label}
              </AppText>
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
          <AppText
            style={{ fontSize: 14, fontWeight: "600", color: COLORS.white }}
          >
            Station 1
          </AppText>
        </View>

        {isEditable && (
          <View
            style={{
              backgroundColor: COLORS.grayLight,
              paddingVertical: 12,
              paddingHorizontal: 16,
            }}
          >
            <TouchableOpacity
              onPress={handleStation1SelectAll}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <ChecklistBox checked={station1SelectAll} />
              <AppText
                style={{ color: COLORS.black, fontSize: 12, fontWeight: "600" }}
              >
                Select All
              </AppText>
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
