import React, { useState } from "react";
import AppText from "../common/AppText";
import AppInput from "../common/AppInput";
import {
  View,
  ScrollView,
  TouchableOpacity
} from "react-native";
import { COLORS } from "../../stylesheets/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function PreInspectionModalFloatsOnboard({
  formData,
  updateForm,
  isEditable = true,
}) {
  const [floatsSelectAll, setFloatsSelectAll] = useState(false);
  const [onboardSelectAll, setOnboardSelectAll] = useState(false);

  // Split into title and label
  const floatsItems = [
    {
      key: "floats_lhRh",
      title: "LH & RH Floats",
      label: "Security - General Condition",
    },
    {
      key: "floats_cylinder",
      title: "Cylinder",
      label: "Pressure & Condition, attachment points",
    },
    {
      key: "floats_hoses",
      title: "Hoses",
      label: "Condition, attachment points",
    },
  ];

  // Split into title and label
  const onboardItems = [
    {
      key: "onboard_firstAid",
      title: "First Aid Kit",
      label: "Condition, no expired",
    },
    {
      key: "onboard_lifeVest",
      title: "Life Vest",
      label: "Condition, cleanliness & no damage",
    },
    {
      key: "onboard_lifeRaft",
      title: "Life-raft",
      label: "Condition, cleanliness & no damage",
    },
    { key: "onboard_axl", title: "AXL", label: "Security - General Condition" },
    {
      key: "onboard_fireExt",
      title: "Fire Extinguisher",
      label: "Security - General Condition",
    },
    {
      key: "onboard_certAirworthiness",
      title: "Certificate of Airworthiness",
      label: "Onboard",
    },
    {
      key: "onboard_certRegistration",
      title: "Certificate of Registration",
      label: "Onboard",
    },
    { key: "onboard_radioLicense", title: "Radio License", label: "Onboard" },
    { key: "onboard_flightLogbook", title: "Flight Logbook", label: "Onboard" },
  ];

  const handleFloatsSelectAll = () => {
    const newValue = !floatsSelectAll;
    setFloatsSelectAll(newValue);
    floatsItems.forEach((item) => {
      updateForm(item.key, newValue);
    });
  };

  const handleOnboardSelectAll = () => {
    const newValue = !onboardSelectAll;
    setOnboardSelectAll(newValue);
    onboardItems.forEach((item) => {
      updateForm(item.key, newValue);
    });
  };

  const handleFloatsCheck = (key) => {
    const currentValue = formData[key] || false;
    updateForm(key, !currentValue);

    const allChecked = floatsItems.every((item) =>
      item.key === key ? !currentValue : formData[item.key] || false,
    );
    setFloatsSelectAll(allChecked);
  };

  const handleOnboardCheck = (key) => {
    const currentValue = formData[key] || false;
    updateForm(key, !currentValue);

    const allChecked = onboardItems.every((item) =>
      item.key === key ? !currentValue : formData[item.key] || false,
    );
    setOnboardSelectAll(allChecked);
  };

  const renderListItem = (index, title, label, field, value, onCheck) => (
    <TouchableOpacity
      key={field}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      accessibilityLabel={`${title}: ${label}`}
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: value ? `${COLORS.primaryLight}12` : COLORS.grayLight,
        borderWidth: 1,
        borderColor: value ? COLORS.primaryLight : COLORS.border,
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
      }}
      onPress={isEditable ? onCheck : null}
      activeOpacity={0.7}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: value ? COLORS.primaryLight : COLORS.grayMedium,
          backgroundColor: value ? COLORS.primaryLight : COLORS.white,
          justifyContent: "center",
          alignItems: "center",
          marginRight: 12,
        }}
      >
        {value && (
          <MaterialCommunityIcons
            name="check-bold"
            size={14}
            color={COLORS.white}
          />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <AppText
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: COLORS.black,
            marginBottom: 3,
          }}
        >
          {index + 1}. {title}
        </AppText>
        <AppText
          style={{
            fontSize: 12,
            lineHeight: 18,
            color: COLORS.grayDark,
            flexWrap: "wrap",
          }}
        >
          {label}
        </AppText>
      </View>
    </TouchableOpacity>
  );

  return (
    <View>
      {/* Floats Card */}
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
            Floats
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
              onPress={handleFloatsSelectAll}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: floatsSelectAll ? COLORS.primaryLight : COLORS.grayMedium,
                  backgroundColor: floatsSelectAll
                    ? COLORS.primaryLight
                    : COLORS.white,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}
              >
                {floatsSelectAll && (
                  <MaterialCommunityIcons
                    name="check-bold"
                    size={14}
                    color={COLORS.white}
                  />
                )}
              </View>
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
          {floatsItems.map((item, index) =>
            renderListItem(
              index,
              item.title,
              item.label,
              item.key,
              formData[item.key] || false,
              () => handleFloatsCheck(item.key),
            ),
          )}
        </View>
      </View>

      {/* Mandatory Onboard Card */}
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
            Mandatory Onboard
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
              onPress={handleOnboardSelectAll}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: onboardSelectAll ? COLORS.primaryLight : COLORS.grayMedium,
                  backgroundColor: onboardSelectAll
                    ? COLORS.primaryLight
                    : COLORS.white,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}
              >
                {onboardSelectAll && (
                  <MaterialCommunityIcons
                    name="check-bold"
                    size={14}
                    color={COLORS.white}
                  />
                )}
              </View>
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
          {onboardItems.map((item, index) =>
            renderListItem(
              index,
              item.title,
              item.label,
              item.key,
              formData[item.key] || false,
              () => handleOnboardCheck(item.key),
            ),
          )}
        </View>
      </View>

      {/* FOB Section Card */}
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
            Fuel On Board
          </AppText>
        </View>

        <View
          style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }}
        >
          <AppText
            style={{
              fontSize: 12,
              color: COLORS.black,
              marginBottom: 8,
              fontWeight: "bold",
            }}
          >
            Fuel On Board: <AppText style={{ color: "red" }}>*</AppText>
          </AppText>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#F3F4F6",
              borderRadius: 6,
              height: 38,
              paddingHorizontal: 12,
            }}
          >
            <AppInput
              style={{
                flex: 1,
                fontSize: 12,
                color: COLORS.black,
                padding: 0,
              }}
              value={formData.fob || ""}
              onChangeText={(text) => updateForm("fob", text)}
              editable={isEditable}
              keyboardType="numeric"
              placeholder=""
              placeholderTextColor={COLORS.grayDark}
            />
            <AppText style={{ fontSize: 12, color: COLORS.black, marginLeft: 4 }}>
              %
            </AppText>
          </View>
        </View>
      </View>
    </View>
  );
}
