import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { COLORS } from "../../stylesheets/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function PostInspectionModalMainRotor({
  formData,
  updateForm,
  isEditable = true,
}) {
  const [mainRotorSelectAll, setMainRotorSelectAll] = useState(false);

  const mainRotorItems = [
    {
      key: "mainRotor_head",
      title: "Main Rotor Head",
      checks: [{ subKey: "condition", label: "Security, general condition" }],
    },
    {
      key: "mainRotor_starflex",
      title: "STARFLEX star",
      checks: [{ subKey: "condition", label: "No delamination, (splinters)" }],
    },
    {
      key: "mainRotor_starRecesses",
      title: "Star recesses",
      checks: [{ subKey: "condition", label: "No cracks" }],
    },
    {
      key: "mainRotor_sphericalBearings",
      title: "Spherical thrust bearings frequency adapters",
      checks: [
        {
          subKey: "condition",
          label:
            "No elastomeric defects, separation, scratches, blisters, extrusion or cracks (other than minor and non evolving surface defects)",
        },
      ],
    },
    {
      key: "mainRotor_ballJoints",
      title: "Self-lubricating ball joints",
      checks: [{ subKey: "condition", label: "No debris nor free-play" }],
    },
    {
      key: "mainRotor_starArms",
      title: "Star arms end bushes",
      checks: [
        {
          subKey: "condition",
          label: "No space between adhesive bead and bush",
        },
      ],
    },
    {
      key: "mainRotor_vibrationAbsorber",
      title: "Vibration absorber",
      checks: [{ subKey: "condition", label: "Security" }],
    },
    {
      key: "mainRotor_blades",
      title: "Blades",
      checks: [
        {
          subKey: "condition",
          label:
            "Security, general coating, tabs, and polyurethane protection condition (visual check for debonding, scratches, cracks, impacts and distortions). No erosion holes on leading edge steel strip, no gaps nor impacts",
        },
      ],
    },
    {
      key: "mainRotor_rightCargoDoor",
      title: "Right cargo door",
      checks: [
        {
          subKey: "opening",
          label: "Opening, condition, attachment points, no abnormal freeplay",
        },
        { subKey: "closed", label: "Closed and secured" },
      ],
    },
    {
      key: "mainRotor_gpuPlug",
      title: "GPU plug planet",
      checks: [
        { subKey: "condition", label: "Closed or plugged-in, as applicable" },
      ],
    },
    {
      key: "mainRotor_rhMgbCowling",
      title: "RH MGB cowling",
      checks: [
        {
          subKey: "opening",
          label: "Opening, condition of locking systems, no abnormal freeplay",
        },
      ],
    },
    {
      key: "mainRotor_transmissionDeck",
      title: "Transmission deck",
      checks: [{ subKey: "cleanliness", label: "Cleanliness" }],
    },
    {
      key: "mainRotor_mgbSupportBars",
      title: "MGB support bars",
      checks: [{ subKey: "condition", label: "Condition, security" }],
    },
    {
      key: "mainRotor_oilCooler",
      title: "Oil cooler, fan and pipes",
      checks: [
        {
          subKey: "condition",
          label: "Condition, no leak, fan security, fan blades condition",
        },
      ],
    },
    {
      key: "mainRotor_servos",
      title: "Servos",
      checks: [
        { subKey: "security", label: "Security check for leaks or cracks" },
      ],
    },
    {
      key: "mainRotor_hydraulicSystem",
      title: "Hydraulic System",
      checks: [
        {
          subKey: "condition",
          label:
            "Security, pipes condition, check for leaks, filter clogging indicator retracted",
        },
      ],
    },
    {
      key: "mainRotor_hydraulicTank",
      title: "Hydraulic system tank",
      checks: [{ subKey: "condition", label: "Level, no leak" }],
    },
    {
      key: "mainRotor_engineOilTank",
      title: "Engine oil tank",
      checks: [
        { subKey: "condition", label: "Oil level, pipes condition, no leak" },
      ],
    },
    {
      key: "mainRotor_electricalHarnesses",
      title: "Electrical harnesses",
      checks: [{ subKey: "condition", label: "Condition, security" }],
    },
    {
      key: "mainRotor_gimbalRing",
      title: "Gimbal ring assembly",
      checks: [
        { subKey: "fitting", label: "Fitting, safety pins set and locked" },
      ],
    },
    {
      key: "mainRotor_rhSideMgbCowling",
      title: "RH side MGB cowling",
      checks: [{ subKey: "closed", label: "Closed and secured" }],
    },
    {
      key: "mainRotor_landingGear",
      title: "Landing gear",
      checks: [
        {
          subKey: "condition",
          label:
            "Condition of cross-tubes, skids, wear resistant plates, footstep security",
        },
      ],
    },
    {
      key: "mainRotor_lowerFairings",
      title: "All lower central fairings",
      checks: [{ subKey: "closed", label: "Closed and secured" }],
    },
    {
      key: "mainRotor_rhCabinAccess",
      title: "RH cabin access doors",
      checks: [
        {
          subKey: "condition",
          label: "Condition, security, locking, no abnormal freeplay",
        },
      ],
    },
    {
      key: "mainRotor_frontDoorJettison",
      title: "Front door jettison system",
      checks: [{ subKey: "condition", label: "Condition, no crack" }],
    },
  ];

  const handleMainRotorSelectAll = () => {
    const newValue = !mainRotorSelectAll;
    setMainRotorSelectAll(newValue);
    mainRotorItems.forEach((item) => {
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
    mainRotorItems.forEach((item) => {
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
      mainRotorItems.forEach((item) => {
        item.checks.forEach((check) => {
          const checkFieldKey = `${item.key}_${check.subKey}`;
          if (!formData[checkFieldKey] && checkFieldKey !== fieldKey) {
            allNowChecked = false;
          }
        });
      });
      setMainRotorSelectAll(allNowChecked);
    } else {
      setMainRotorSelectAll(false);
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
      {/* Main Rotor Head Card */}
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
            Main Rotor Head
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
              onPress={handleMainRotorSelectAll}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: COLORS.primaryLight,
                  backgroundColor: mainRotorSelectAll
                    ? COLORS.primaryLight
                    : "transparent",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}
              >
                {mainRotorSelectAll && (
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
          {mainRotorItems.map((item, index) =>
            renderItemWithChecks(index, item),
          )}
        </View>
      </View>
    </View>
  );
}
