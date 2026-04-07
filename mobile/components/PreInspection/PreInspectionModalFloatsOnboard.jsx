import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { COLORS } from "../../stylesheets/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function PreInspectionModalFloatsOnboard({ formData, updateForm, isEditable = true }) {
  const [floatsSelectAll, setFloatsSelectAll] = useState(false);
  const [onboardSelectAll, setOnboardSelectAll] = useState(false);

  // Split into title and label
  const floatsItems = [
    { key: "floats_lhRh", title: "LH & RH Floats", label: "Security - General Condition" },
    { key: "floats_cylinder", title: "Cylinder", label: "Pressure & Condition, attachment points" },
    { key: "floats_hoses", title: "Hoses", label: "Condition, attachment points" },
  ];

  // Split into title and label
  const onboardItems = [
    { key: "onboard_firstAid", title: "First Aid Kit", label: "Condition, no expired" },
    { key: "onboard_lifeVest", title: "Life Vest", label: "Condition, cleanliness & no damage" },
    { key: "onboard_lifeRaft", title: "Life-raft", label: "Condition, cleanliness & no damage" },
    { key: "onboard_axl", title: "AXL", label: "Security - General Condition" },
    { key: "onboard_fireExt", title: "Fire Extinguisher", label: "Security - General Condition" },
    { key: "onboard_certAirworthiness", title: "Certificate of Airworthiness", label: "Onboard" },
    { key: "onboard_certRegistration", title: "Certificate of Registration", label: "Onboard" },
    { key: "onboard_radioLicense", title: "Radio License", label: "Onboard" },
    { key: "onboard_flightLogbook", title: "Flight Logbook", label: "Onboard" },
  ];

  const handleFloatsSelectAll = () => {
    const newValue = !floatsSelectAll;
    setFloatsSelectAll(newValue);
    floatsItems.forEach(item => {
      updateForm(item.key, newValue);
    });
  };

  const handleOnboardSelectAll = () => {
    const newValue = !onboardSelectAll;
    setOnboardSelectAll(newValue);
    onboardItems.forEach(item => {
      updateForm(item.key, newValue);
    });
  };

  const handleFloatsCheck = (key) => {
    const currentValue = formData[key] || false;
    updateForm(key, !currentValue);
    
    const allChecked = floatsItems.every(item => 
      item.key === key ? !currentValue : (formData[item.key] || false)
    );
    setFloatsSelectAll(allChecked);
  };

  const handleOnboardCheck = (key) => {
    const currentValue = formData[key] || false;
    updateForm(key, !currentValue);
    
    const allChecked = onboardItems.every(item => 
      item.key === key ? !currentValue : (formData[item.key] || false)
    );
    setOnboardSelectAll(allChecked);
  };

const renderListItem = (index, title, label, field, value, onCheck) => (
    <View key={field} style={{ marginBottom: 18 }}>
      <Text style={{ 
        fontSize: 16, 
        fontWeight: "bold", 
        color: COLORS.black, 
        marginBottom: 8 
      }}>
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
            <MaterialCommunityIcons name="check" size={14} color={COLORS.white} />
          )}
        </View>
        <Text style={{ 
          fontSize: 16, 
          color: COLORS.grayDark,
          flex: 1,
          flexWrap: "wrap",
        }}>
          {label}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View>
      
      {/* Floats Card */}
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
          }}
        >
          <Text style={{ fontSize: 24, fontWeight: "600", color: COLORS.white }}>
            Floats
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
              onPress={handleFloatsSelectAll}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: COLORS.primaryLight,
                  backgroundColor: floatsSelectAll ? COLORS.primaryLight : "transparent",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}
              >
                {floatsSelectAll && (
                  <MaterialCommunityIcons name="check" size={14} color={COLORS.white} />
                )}
              </View>
              <Text style={{ color: COLORS.black, fontSize: 16, fontWeight: "500" }}>
                Select All
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
          {floatsItems.map((item, index) => (
            renderListItem(
              index,
              item.title,
              item.label,
              item.key,
              formData[item.key] || false,
              () => handleFloatsCheck(item.key)
            )
          ))}
        </View>
      </View>

      {/* Mandatory Onboard Card */}
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
          }}
        >
          <Text style={{ fontSize: 24, fontWeight: "600", color: COLORS.white }}>
            Mandatory Onboard
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
              onPress={handleOnboardSelectAll}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: COLORS.primaryLight,
                  backgroundColor: onboardSelectAll ? COLORS.primaryLight : "transparent",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}
              >
                {onboardSelectAll && (
                  <MaterialCommunityIcons name="check" size={14} color={COLORS.white} />
                )}
              </View>
              <Text style={{ color: COLORS.black, fontSize: 16, fontWeight: "500" }}>
                Select All
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
          {onboardItems.map((item, index) => (
            renderListItem(
              index,
              item.title,
              item.label,
              item.key,
              formData[item.key] || false,
              () => handleOnboardCheck(item.key)
            )
          ))}
        </View>
      </View>

      {/* FOB Section Card */}
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
        <View
          style={{
            backgroundColor: COLORS.primaryLight,
            paddingVertical: 12,
            paddingHorizontal: 16,
          }}
        >
          <Text style={{ fontSize: 24, fontWeight: "600", color: COLORS.white }}>
            FOB
          </Text>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }}>
          <Text style={{ fontSize: 16, color: COLORS.black, marginBottom: 8, fontWeight: "bold" }}>
            FOB:
          </Text>
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#F3F4F6", 
            borderRadius: 6,
            height: 38,
            paddingHorizontal: 12,
          }}>
            <TextInput
              style={{
                flex: 1,
                fontSize: 16,
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
            <Text style={{ fontSize: 16, color: COLORS.black, marginLeft: 4 }}>
              %
            </Text>
          </View>
        </View>
      </View>
      
    </View>
  );
}