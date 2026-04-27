import React, { useState, useEffect } from "react";
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
import { API_BASE } from "../../utilities/API_BASE";

export default function FlightLogModalInfo({ formData, updateForm, isEditable = true, onAircraftDataLoaded }) {
  const [showRPCDropdown, setShowRPCDropdown] = useState(false);
  const [aircraftOptions, setAircraftOptions] = useState([]);

  const fetchAircraftOptions = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/parts-monitoring/aircraft-list`);
      const data = await response.json();

      console.log("Fetched aircraft options:", data);
      if (response.ok) {
        setAircraftOptions(data.data);
      
      }
    } catch (error) {
      console.error("Error fetching aircraft options:", error);
    }
  }

  useEffect(() => {
    fetchAircraftOptions();
  }, []);

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

  const toggleRPCDropdown = () => {
    setShowRPCDropdown(!showRPCDropdown);
  };

  const renderAircraftType = () => (
    <View>
      <TextInput
        style={{
          backgroundColor: isEditable ? "#F2F2F2" : "#E8E8E8",
          borderRadius: 6,
          height: 42,
          paddingHorizontal: 12,
          fontSize: 14,
          color: isEditable ? COLORS.black : COLORS.grayDark,
        }}
        value={formData.aircraftType || ""}
        onChangeText={(text) => updateForm("aircraftType", text)}
        placeholderTextColor={COLORS.grayDark}
        editable={false}
      />
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
          {formData.rpc || "Select RP-C"}
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
            {aircraftOptions.map((rpc, index) => (
              <TouchableOpacity
                key={index}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderBottomWidth: index < aircraftOptions.length - 1 ? 1 : 0,
                  borderBottomColor: COLORS.grayLight,
                  backgroundColor:
                    formData.rpc === rpc
                      ? COLORS.primaryLight + "10"
                      : COLORS.white,
                }}
                onPress={() => {
                  updateForm("rpc", rpc);              // ✅ Update rpc
                  setShowRPCDropdown(false);           // ✅ Close RP/C dropdown

                  const fetchAircraftType = async () => {
                    try {
                      const response = await fetch(`${API_BASE}/api/parts-monitoring/${rpc}`);
                      const data = await response.json();

                      if (response.ok) {
                        updateForm("aircraftType", data.data.aircraftType);
                        onAircraftDataLoaded(data.data);
                        console.log (data.data)
                      }

                    } catch (error) {
                      console.error("Error fetching aircraft type:", error);
                    }
                  };

                  fetchAircraftType();
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
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          color: COLORS.grayDark,
          marginBottom: 16,
        }}
      >
        Basic Information
      </Text>

      <View
        style={{
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
        }}
      >
        <View
          style={{
            backgroundColor: COLORS.primaryLight,
            paddingVertical: 14,
            paddingHorizontal: 16,
          }}
        >
          <Text
            style={{ fontSize: 16, color: COLORS.white, fontWeight: "600" }}
          >
            Rotary Winged Aircraft - Single Engine
          </Text>
        </View>

        <View style={{ padding: 20 }}>
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, color: COLORS.black, marginBottom: 6, fontWeight: "500" }}>
              RP-C:
            </Text>
            {renderRPCDropdown()}
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 13,
                color: COLORS.black,
                marginBottom: 6,
                fontWeight: "500",
              }}
            >
              Aircraft Type:
            </Text>
            {renderAircraftType()}
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 13,
                color: COLORS.black,
                marginBottom: 6,
                fontWeight: "500",
              }}
            >
              Date:
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#E8E8E8",
                borderRadius: 6,
                height: 42,
                paddingHorizontal: 12,
              }}
            >
              <Text style={{ fontSize: 14, color: COLORS.grayDark }}>
                {formatDate(formData.date)}
              </Text>
              <MaterialCommunityIcons
                name="calendar-blank"
                size={18}
                color={COLORS.grayDark}
              />
            </View>
          </View>

          <View style={{ marginBottom: 8 }}>
            <Text
              style={{
                fontSize: 13,
                color: COLORS.black,
                marginBottom: 6,
                fontWeight: "500",
              }}
            >
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
