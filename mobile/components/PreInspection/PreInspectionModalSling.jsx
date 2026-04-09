import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { COLORS } from "../../stylesheets/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function PreInspectionModalSling({
  formData,
  updateForm,
  isEditable = true,
}) {
  const [station3SelectAll, setStation3SelectAll] = useState(false);
  const [slingSelectAll, setSlingSelectAll] = useState(false);

  const station3Items = [
    {
      key: "station3_heatShield",
      title: "Heat shield on tail drive",
      label: "Condition, attachment",
    },
    {
      key: "station3_tailBoom",
      title: "Tail boom, antennas",
      label: "Condition - Fairings fasteners locked",
    },
    {
      key: "station3_stabilizer",
      title: "Stabilizer, fin, external lights",
      label: "General condition",
    },
    {
      key: "station3_tailRotorGuard",
      title: "Tail rotor guard (if fitted)",
      label: "Condition, attachment",
    },
    {
      key: "station3_tgbFairing",
      title: "TGB fairing",
      label: "Secured, fasteners locked",
    },
    { key: "station3_tgbOilLevel", title: "TGB oil level", label: "Checked" },
    {
      key: "station3_tailSkid",
      title: "Tail skid",
      label: "Condition, attachment",
    },
    {
      key: "station3_flexibleCoupling",
      title: "Flexible Coupling",
      label: "Visual Check No Crack",
    },
  ];

  const slingItems = [
    {
      key: "sling_sling",
      title: "Sling",
      label: "Security - General condition",
    },
    {
      key: "sling_cablePins",
      title: "Cable and Pins",
      label: "Condition, attachment points",
    },
  ];

  const handleStation3SelectAll = () => {
    const newValue = !station3SelectAll;
    setStation3SelectAll(newValue);
    station3Items.forEach((item) => {
      updateForm(item.key, newValue);
    });
  };

  const handleSlingSelectAll = () => {
    const newValue = !slingSelectAll;
    setSlingSelectAll(newValue);
    slingItems.forEach((item) => {
      updateForm(item.key, newValue);
    });
  };

  const handleStation3Check = (key) => {
    const currentValue = formData[key] || false;
    updateForm(key, !currentValue);

    const allChecked = station3Items.every((item) =>
      item.key === key ? !currentValue : formData[item.key] || false,
    );
    setStation3SelectAll(allChecked);
  };

  const handleSlingCheck = (key) => {
    const currentValue = formData[key] || false;
    updateForm(key, !currentValue);

    const allChecked = slingItems.every((item) =>
      item.key === key ? !currentValue : formData[item.key] || false,
    );
    setSlingSelectAll(allChecked);
  };

  const renderListItem = (index, title, label, field, value, onCheck) => (
    <View key={field} style={{ marginBottom: 18 }}>
      <Text
        style={{
          fontSize: 16,
          fontWeight: "bold",
          color: COLORS.black,
          marginBottom: 8,
        }}
      >
        {index + 1}. {title}
      </Text>

      <TouchableOpacity
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginLeft: 14,
          paddingRight: 8,
        }}
        onPress={isEditable ? onCheck : null}
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
            fontSize: 16,
            color: COLORS.grayDark,
            flex: 1,
            flexWrap: "wrap",
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View>
      {/* Station 3 Card */}
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
            style={{ fontSize: 24, fontWeight: "600", color: COLORS.white }}
          >
            Station 3
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
              onPress={handleStation3SelectAll}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: COLORS.primaryLight,
                  backgroundColor: station3SelectAll
                    ? COLORS.primaryLight
                    : "transparent",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}
              >
                {station3SelectAll && (
                  <MaterialCommunityIcons
                    name="check"
                    size={14}
                    color={COLORS.white}
                  />
                )}
              </View>
              <Text
                style={{ color: COLORS.black, fontSize: 16, fontWeight: "500" }}
              >
                Select All
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View
          style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}
        >
          {station3Items.map((item, index) =>
            renderListItem(
              index,
              item.title,
              item.label,
              item.key,
              formData[item.key] || false,
              () => handleStation3Check(item.key),
            ),
          )}
        </View>
      </View>

      {/* Sling Card */}
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
            style={{ fontSize: 24, fontWeight: "600", color: COLORS.white }}
          >
            Sling
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
              onPress={handleSlingSelectAll}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: COLORS.primaryLight,
                  backgroundColor: slingSelectAll
                    ? COLORS.primaryLight
                    : "transparent",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}
              >
                {slingSelectAll && (
                  <MaterialCommunityIcons
                    name="check"
                    size={14}
                    color={COLORS.white}
                  />
                )}
              </View>
              <Text
                style={{ color: COLORS.black, fontSize: 16, fontWeight: "500" }}
              >
                Select All
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View
          style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}
        >
          {slingItems.map((item, index) =>
            renderListItem(
              index,
              item.title,
              item.label,
              item.key,
              formData[item.key] || false,
              () => handleSlingCheck(item.key),
            ),
          )}
        </View>
      </View>
    </View>
  );
}
