import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { COLORS } from "../../stylesheets/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function PreInspectionModalStations({
  formData,
  updateForm,
  isEditable = true,
}) {
  const [station1SelectAll, setStation1SelectAll] = useState(false);
  const [station2SelectAll, setStation2SelectAll] = useState(false);

  const station1Items = [
    {
      key: "station1_transparentPanels",
      title: "Transparent Panels",
      label: "Condition - Cleanliness",
    },
    {
      key: "station1_engineOilCooler",
      title: "Engine oil cooler air inlet",
      label: "Check no obstruction nor debris",
    },
    {
      key: "station1_sideSlipIndicator",
      title: "Side slip indicator",
      label: "Condition",
    },
    {
      key: "station1_pitotTube",
      title: "Pitot tube",
      label: "Cover removed - Condition",
    },
    {
      key: "station1_landingLights",
      title: "Landing lights",
      label: "Condition",
    },
  ];

  const station2Items = [
    {
      key: "station2_frontDoor",
      title: "Front door",
      label: "Condition jettison system check",
    },
    {
      key: "station2_rearDoor",
      title: "Rear door",
      label: "Condition, closed, or opened lock (sliding door)",
    },
    {
      key: "station2_leftCargoDoorOpen",
      title: "Left cargo door",
      label: "Open",
    },
    {
      key: "station2_loadsObjects",
      title: "Loads and objects carried",
      label: "Secured",
    },
    {
      key: "station2_leftCargoDoorClosed",
      title: "Left cargo door",
      label: "Closed, locked",
    },
    {
      key: "station2_fuelTank",
      title: "Fuel tank and system",
      label: "Filler plug closed, Tank sump drained",
    },
    {
      key: "station1_mgbCowl",
      title: "MGB cowl",
      label: "MGB oil level - Cowl locked",
    },
    {
      key: "station1_lowerFairings",
      title: "All lower fairings panels",
      label: "Locked",
    },
    {
      key: "station1_landingGear",
      title: "Landing gear and footstep",
      label: "Secure - Visual Check",
    },
    {
      key: "station1_staticPorts",
      title: "Static ports",
      label: "Clear, covers removed",
    },
    {
      key: "station1_oatSensor",
      title: "OAT sensor, antennas",
      label: "Condition",
    },
    {
      key: "station1_mainRotor",
      title: "Main rotor head blades",
      label: "Visual inspection, no impact",
    },
    {
      key: "station1_engineAirIntake",
      title: "Engine air intake",
      label: "Clear (water, snow foreign object)",
    },
    { key: "station1_engineCowl", title: "Engine cowl", label: "Locked" },
    { key: "station1_exhaustCover", title: "Exhaust cover", label: "Removed" },
    {
      key: "station1_rearCargoDoorOpen",
      title: "Rear cargo door",
      label: "Opened",
    },
    {
      key: "station1_loadsObjects",
      title: "Loads and object carried",
      label: "Secured",
    },
    { key: "station1_elt", title: "ELT", label: "Check ARMED" },
    {
      key: "station1_rearCargoDoorClosed",
      title: "Rear cargo door",
      label: "Closed, locked",
    },
    {
      key: "station1_oilDrain",
      title: "Oil drain",
      label: "No oil under scupper",
    },
  ];

  const handleStation1SelectAll = () => {
    const newValue = !station1SelectAll;
    setStation1SelectAll(newValue);
    station1Items.forEach((item) => {
      updateForm(item.key, newValue);
    });
  };

  const handleStation2SelectAll = () => {
    const newValue = !station2SelectAll;
    setStation2SelectAll(newValue);
    station2Items.forEach((item) => {
      updateForm(item.key, newValue);
    });
  };

  const handleStation1Check = (key) => {
    const currentValue = formData[key] || false;
    updateForm(key, !currentValue);

    const allChecked = station1Items.every((item) =>
      item.key === key ? !currentValue : formData[item.key] || false,
    );
    setStation1SelectAll(allChecked);
  };

  const handleStation2Check = (key) => {
    const currentValue = formData[key] || false;
    updateForm(key, !currentValue);

    const allChecked = station2Items.every((item) =>
      item.key === key ? !currentValue : formData[item.key] || false,
    );
    setStation2SelectAll(allChecked);
  };

  const renderListItem = (index, title, label, field, value, onCheck) => (
    <View key={field} style={{ marginBottom: 18 }}>
      <Text
        style={{
          fontSize: 18,
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
            fontSize: 18,
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
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 0 }}
    >
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
            style={{ fontSize: 24, fontWeight: "600", color: COLORS.white }}
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
                style={{ color: COLORS.black, fontSize: 18, fontWeight: "500" }}
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
            renderListItem(
              index,
              item.title,
              item.label,
              item.key,
              formData[item.key] || false,
              () => handleStation1Check(item.key),
            ),
          )}
        </View>
      </View>

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
            style={{ fontSize: 24, fontWeight: "600", color: COLORS.white }}
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
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: COLORS.primaryLight,
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
                style={{ color: COLORS.black, fontSize: 18, fontWeight: "500" }}
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
            renderListItem(
              index,
              item.title,
              item.label,
              item.key,
              formData[item.key] || false,
              () => handleStation2Check(item.key),
            ),
          )}
        </View>
      </View>
    </ScrollView>
  );
}
