import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import { COLORS } from "../../stylesheets/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function PostInspectionModalEngine({ formData, updateForm, isEditable = true }) {
  const [engineSelectAll, setEngineSelectAll] = useState(false);
  const [station3SelectAll, setStation3SelectAll] = useState(false);

  // Engine and Engine Bay items
  const engineItems = [
    { 
      key: "engine_airInlet", 
      title: "Engine air inlet", 
      checks: [
        { subKey: "condition", label: "Security, condition, seal condition" }
      ]
    },
    { 
      key: "engine_firewall", 
      title: "Firewall", 
      checks: [
        { subKey: "condition", label: "Condition, check for cracks" }
      ]
    },
    { 
      key: "engine_accessories", 
      title: "Engine and accessories", 
      checks: [
        { subKey: "condition", label: "General condition, cleanliness sealing, attachment pipes, electrical harness" }
      ]
    },
    { 
      key: "engine_transmissionDeck", 
      title: "Engine transmission deck", 
      checks: [
        { subKey: "condition", label: "Condition, cleanliness, no leak" }
      ]
    },
    { 
      key: "engine_case", 
      title: "Engine case", 
      checks: [
        { subKey: "condition", label: "Mounting pads condition" }
      ]
    },
    { 
      key: "engine_oilFilter", 
      title: "Oil filter", 
      checks: [
        { subKey: "condition", label: "Clogging indicator retracted" }
      ]
    },
    { 
      key: "engine_fuelFilter", 
      title: "Fuel filter", 
      checks: [
        { subKey: "condition", label: "Clogging indicator retracted" }
      ]
    },
    { 
      key: "engine_oilSystem", 
      title: "Oil system", 
      checks: [
        { subKey: "condition", label: "Check for leaks" }
      ]
    },
    { 
      key: "engine_mounts", 
      title: "Engine mounts", 
      checks: [
        { subKey: "condition", label: "Condition, security" }
      ]
    },
    { 
      key: "engine_deckDrainHoles", 
      title: "Engine deck drain holes", 
      checks: [
        { subKey: "condition", label: "Free from obstructions and debris" }
      ]
    },
    { 
      key: "engine_exhaustPipe", 
      title: "Exhaust pipe", 
      checks: [
        { subKey: "condition", label: "Condition, blanking fitted or removed, as necessary" }
      ]
    },
  ];

  // Station 3 items
  const station3Items = [
    { 
      key: "station3_scissors", 
      title: "Scissors, swashplates, rods swivel bearings", 
      checks: [
        { subKey: "condition", label: "Condition, security, freeplay evolution (manual check)" }
      ]
    },
    { 
      key: "station3_swashPlate", 
      title: "Swash plate/pitch change rods and end-fittings interface", 
      checks: [
        { subKey: "condition", label: "No contact traces or paint scaling on swashplate driving yokes" }
      ]
    },
    { 
      key: "station3_pitchChangeRods", 
      title: "Pitch change rods", 
      checks: [
        { subKey: "condition", label: "Condition, no radial free play at end fittings, paint marks visible and aligned" }
      ]
    },
    { 
      key: "station3_rotorShaft", 
      title: "Rotor shaft, all visible parts, particularly under the hub", 
      checks: [
        { subKey: "condition", label: "Paint condition, no cracks, crazing, blistering, corrosion nor tools marks" }
      ]
    },
  ];

  const handleEngineSelectAll = () => {
    const newValue = !engineSelectAll;
    setEngineSelectAll(newValue);
    engineItems.forEach(item => {
      item.checks.forEach(check => {
        updateForm(`${item.key}_${check.subKey}`, newValue);
      });
    });
  };

  const handleStation3SelectAll = () => {
    const newValue = !station3SelectAll;
    setStation3SelectAll(newValue);
    station3Items.forEach(item => {
      item.checks.forEach(check => {
        updateForm(`${item.key}_${check.subKey}`, newValue);
      });
    });
  };

  const handleEngineCheck = (itemKey, subKey) => {
    const fieldKey = `${itemKey}_${subKey}`;
    const currentValue = formData[fieldKey] || false;
    updateForm(fieldKey, !currentValue);
    
    // Update select all state
    let allChecked = true;
    engineItems.forEach(item => {
      item.checks.forEach(check => {
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
      engineItems.forEach(item => {
        item.checks.forEach(check => {
          const checkFieldKey = `${item.key}_${check.subKey}`;
          if (!formData[checkFieldKey] && checkFieldKey !== fieldKey) {
            allNowChecked = false;
          }
        });
      });
      setEngineSelectAll(allNowChecked);
    } else {
      setEngineSelectAll(false);
    }
  };

  const handleStation3Check = (itemKey, subKey) => {
    const fieldKey = `${itemKey}_${subKey}`;
    const currentValue = formData[fieldKey] || false;
    updateForm(fieldKey, !currentValue);
    
    let allChecked = true;
    station3Items.forEach(item => {
      item.checks.forEach(check => {
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
      station3Items.forEach(item => {
        item.checks.forEach(check => {
          const checkFieldKey = `${item.key}_${check.subKey}`;
          if (!formData[checkFieldKey] && checkFieldKey !== fieldKey) {
            allNowChecked = false;
          }
        });
      });
      setStation3SelectAll(allNowChecked);
    } else {
      setStation3SelectAll(false);
    }
  };

  const renderItemWithChecks = (index, item, isStation3 = false) => {
    const handleCheck = isStation3 ? handleStation3Check : handleEngineCheck;
    
    return (
      <View key={item.key} style={{ marginBottom: 20 }}>
        <Text style={{ 
          fontSize: 12, 
          fontWeight: "bold", 
          color: COLORS.black, 
          marginBottom: 10 
        }}>
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
              onPress={isEditable ? () => handleCheck(item.key, check.subKey) : null}
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
                  <MaterialCommunityIcons name="check" size={14} color={COLORS.white} />
                )}
              </View>
              <Text style={{ 
                fontSize: 12, 
                color: COLORS.grayDark,
                flex: 1,
                flexWrap: "wrap",
              }}>
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
      {/* Engine and Engine Bay Card */}
      <View style={{ 
        backgroundColor: COLORS.white,
        borderRadius: 8,
        marginBottom: 24,
        elevation: 4,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        overflow: "hidden"
      }}>
        <View style={{
          backgroundColor: COLORS.primaryLight,
          paddingVertical: 12,
          paddingHorizontal: 16,
        }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.white }}>
            Engine and Engine Bay
          </Text>
        </View>

        {isEditable && (
          <View style={{
            borderBottomWidth: 1,
            borderBottomColor: COLORS.grayMedium,
            paddingVertical: 14,
            paddingHorizontal: 16,
          }}>
            <TouchableOpacity 
              onPress={handleEngineSelectAll}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: COLORS.primaryLight,
                  backgroundColor: engineSelectAll ? COLORS.primaryLight : "transparent",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}
              >
                {engineSelectAll && (
                  <MaterialCommunityIcons name="check" size={14} color={COLORS.white} />
                )}
              </View>
              <Text style={{ color: COLORS.black, fontSize: 12, fontWeight: "500" }}>
                Select All
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
          {engineItems.map((item, index) => renderItemWithChecks(index, item, false))}
        </View>
      </View>

      {/* Station 3 Card */}
      <View style={{ 
        backgroundColor: COLORS.white,
        borderRadius: 8,
        marginBottom: 24,
        elevation: 4,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        overflow: "hidden"
      }}>
        <View style={{
          backgroundColor: COLORS.primaryLight,
          paddingVertical: 12,
          paddingHorizontal: 16,
        }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.white }}>
            Station 3
          </Text>
        </View>

        {isEditable && (
          <View style={{
            borderBottomWidth: 1,
            borderBottomColor: COLORS.grayMedium,
            paddingVertical: 14,
            paddingHorizontal: 16,
          }}>
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
                  backgroundColor: station3SelectAll ? COLORS.primaryLight : "transparent",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}
              >
                {station3SelectAll && (
                  <MaterialCommunityIcons name="check" size={14} color={COLORS.white} />
                )}
              </View>
              <Text style={{ color: COLORS.black, fontSize: 12, fontWeight: "500" }}>
                Select All
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
          {station3Items.map((item, index) => renderItemWithChecks(index, item, true))}
        </View>
      </View>
    </View>
  );
}
