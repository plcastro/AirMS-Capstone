import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { COLORS } from "../../stylesheets/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { flightLogsMockData } from "../../components/FlightLog/FlightLogMockData";

export default function FlightLogModalInfo({ formData, updateForm, isEditable = true }) {
  const [showAircraftDropdown, setShowAircraftDropdown] = useState(false);
  const [showRPCDropdown, setShowRPCDropdown] = useState(false);
  
  const aircraftTypes = [...new Set(flightLogsMockData.map(log => log.aircraftType))];
  const rpcOptions = [...new Set(flightLogsMockData.map(log => log.rpc))];

  const formatDate = (date) => {
    if (!date) return "";
    
    let dateObj;
    
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === "string") {
      const parts = date.split("/");
      if (parts.length === 3) {
        const month = parseInt(parts[0], 10) - 1;
        const day = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        dateObj = new Date(year, month, day);
      } else {
        dateObj = new Date(date);
      }
    } else if (typeof date === "number") {
      dateObj = new Date(date);
    } else {
      return "";
    }
    
    if (isNaN(dateObj.getTime())) return "";
    
    return dateObj.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  const toggleAircraftDropdown = () => {
    setShowAircraftDropdown(!showAircraftDropdown);
    setShowRPCDropdown(false);
  };

  const toggleRPCDropdown = () => {
    setShowRPCDropdown(!showRPCDropdown);
    setShowAircraftDropdown(false);
  };

  const renderAircraftDropdown = () => (
    <View style={{ zIndex: showAircraftDropdown ? 3000 : 2000 }}>
      <TouchableOpacity
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: isEditable ? "#F8F8F8" : "#E8E8E8",
          borderRadius: 6,
          borderWidth: 1,
          borderColor: COLORS.grayMedium,
          height: 42,
          paddingHorizontal: 12,
        }}
        onPress={isEditable ? toggleAircraftDropdown : null}
      >
        <Text style={{ 
          fontSize: 14, 
          color: formData.aircraftType ? COLORS.black : COLORS.grayDark 
        }}>
          {formData.aircraftType || "Select Aircraft Type"}
        </Text>
        {isEditable && (
          <MaterialCommunityIcons 
            name={showAircraftDropdown ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={COLORS.grayDark} 
          />
        )}
      </TouchableOpacity>

      {showAircraftDropdown && isEditable && (
        <View style={{
          position: "absolute",
          top: 46,
          left: 0,
          right: 0,
          backgroundColor: COLORS.white,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: COLORS.grayMedium,
          zIndex: 3000,
          elevation: 5,
          shadowColor: COLORS.black,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          maxHeight: 200,
        }}>
          <ScrollView showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
            {aircraftTypes.map((type, index) => (
              <TouchableOpacity
                key={index}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderBottomWidth: index < aircraftTypes.length - 1 ? 1 : 0,
                  borderBottomColor: COLORS.grayLight,
                  backgroundColor: formData.aircraftType === type ? COLORS.primaryLight + "10" : COLORS.white,
                }}
                onPress={() => {
                  updateForm("aircraftType", type);
                  setShowAircraftDropdown(false);
                }}
              >
                <Text style={{ 
                  fontSize: 14,
                  color: formData.aircraftType === type ? COLORS.primaryLight : COLORS.black,
                }}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  const renderRPCDropdown = () => (
    <View style={{ zIndex: showRPCDropdown ? 3000 : 1000 }}>
      <TouchableOpacity
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: isEditable ? "#F8F8F8" : "#E8E8E8",
          borderRadius: 6,
          borderWidth: 1,
          borderColor: COLORS.grayMedium,
          height: 42,
          paddingHorizontal: 12,
        }}
        onPress={isEditable ? toggleRPCDropdown : null}
      >
        <Text style={{ 
          fontSize: 14, 
          color: formData.rpc ? COLORS.black : COLORS.grayDark 
        }}>
          {formData.rpc || "Select RP/C"}
        </Text>
        {isEditable && (
          <MaterialCommunityIcons 
            name={showRPCDropdown ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={COLORS.grayDark} 
          />
        )}
      </TouchableOpacity>

      {showRPCDropdown && isEditable && (
        <View style={{
          position: "absolute",
          top: 46,
          left: 0,
          right: 0,
          backgroundColor: COLORS.white,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: COLORS.grayMedium,
          zIndex: 3000,
          elevation: 5,
          shadowColor: COLORS.black,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          maxHeight: 200,
        }}>
          <ScrollView showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
            {rpcOptions.map((rpc, index) => (
              <TouchableOpacity
                key={index}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderBottomWidth: index < rpcOptions.length - 1 ? 1 : 0,
                  borderBottomColor: COLORS.grayLight,
                  backgroundColor: formData.rpc === rpc ? COLORS.primaryLight + "10" : COLORS.white,
                }}
                onPress={() => {
                  updateForm("rpc", rpc);
                  setShowRPCDropdown(false);
                }}
              >
                <Text style={{ 
                  fontSize: 14,
                  color: formData.rpc === rpc ? COLORS.primaryLight : COLORS.black,
                }}>
                  {rpc}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.grayDark, marginBottom: 16 }}>
        Basic Information
      </Text>

      <View style={{
        backgroundColor: COLORS.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.grayMedium,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
        overflow: "hidden",
      }}>
        <View style={{ backgroundColor: COLORS.primaryLight, paddingVertical: 14, paddingHorizontal: 16 }}>
          <Text style={{ fontSize: 16, color: COLORS.white, fontWeight: "600" }}>
            Rotary Winged Aircraft - Single Engine
          </Text>
        </View>

        <View style={{ padding: 20 }}>
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, color: COLORS.black, marginBottom: 6, fontWeight: "500" }}>
              Aircraft Type:
            </Text>
            {renderAircraftDropdown()}
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, color: COLORS.black, marginBottom: 6, fontWeight: "500" }}>
              RP-C:
            </Text>
            {renderRPCDropdown()}
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, color: COLORS.black, marginBottom: 6, fontWeight: "500" }}>
              Date:
            </Text>
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "#E8E8E8",
              borderRadius: 6,
              height: 42,
              paddingHorizontal: 12,
            }}>
              <Text style={{ fontSize: 14, color: COLORS.grayDark }}>
                {formatDate(formData.date)}
              </Text>
              <MaterialCommunityIcons name="calendar-blank" size={18} color={COLORS.grayDark} />
            </View>
          </View>

          <View style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 13, color: COLORS.black, marginBottom: 6, fontWeight: "500" }}>
              Control No.:
            </Text>
            <TextInput
              style={{
                backgroundColor: isEditable ? "#F2F2F2" : "#E8E8E8",
                borderRadius: 6,
                height: 42,
                paddingHorizontal: 12,
                fontSize: 14,
                color: isEditable ? COLORS.black : COLORS.grayDark,
              }}
              value={formData.controlNo}
              onChangeText={(text) => updateForm("controlNo", text)}
              editable={isEditable}
            />
          </View>
        </View>
      </View>
    </View>
  );
}