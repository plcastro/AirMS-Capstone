import React, { useEffect, useRef, useState } from "react";
import AppText from "../common/AppText";
import AppInput from "../common/AppInput";
import { View, TouchableOpacity, ScrollView } from "react-native";
import { COLORS } from "../../stylesheets/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { API_BASE } from "../../utilities/API_BASE";
import { isB412Aircraft } from "./b412PostInspectionData";
import DateInput from "../common/DateInput";

export default function PostInspectionModalInfo({
  formData,
  updateForm,
  isEditable = true,
  isAircraftEditable = isEditable,
  rpcOptions = [],
}) {
  const [showRPCDropdown, setShowRPCDropdown] = useState(false);
  const aircraftTypeRequestRef = useRef(0);

  const dynamicRpcOptions = Array.from(
    new Set(
      [...rpcOptions, formData.rpc]
        .map((rpc) => String(rpc || "").trim())
        .filter(Boolean),
    ),
  );

  const toggleRPCDropdown = () => {
    setShowRPCDropdown(!showRPCDropdown);
  };

  const resolveAircraftTypeByRpc = async (rpc) => {
    const requestId = ++aircraftTypeRequestRef.current;

    try {
      if (!rpc) return;
      const response = await fetch(
        `${API_BASE}/api/parts-monitoring/${encodeURIComponent(rpc)}`,
      );
      if (!response.ok) return;

      const data = await response.json();
      if (requestId !== aircraftTypeRequestRef.current) return;

      const resolvedType = data?.data?.aircraftType || "";
      if (resolvedType) {
        updateForm("aircraftType", resolvedType);
      }
    } catch (error) {
      console.error(
        "Error resolving aircraft type for post-inspection:",
        error,
      );
    }
  };

  useEffect(() => {
    if (formData.rpc && !formData.aircraftType) {
      resolveAircraftTypeByRpc(formData.rpc);
    }
  }, [formData.rpc]);

  const aircraftClassLabel = isB412Aircraft(formData.aircraftType)
    ? "Rotary Winged Aircraft - Twin Engine"
    : "Rotary Winged Aircraft - Single Engine";

  const renderAircraftTypeField = () => (
    <View>
      <AppInput
        style={{
          backgroundColor: "#E8E8E8",
          borderRadius: 6,
          height: 42,
          paddingHorizontal: 12,
          fontSize: 12,
          color: COLORS.grayDark,
        }}
        value={formData.aircraftType || ""}
        editable={false}
        placeholder="Auto-filled from RP-C"
        placeholderTextColor={COLORS.grayDark}
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
          backgroundColor: isAircraftEditable ? "#F8F8F8" : "#E8E8E8",
          borderRadius: 6,
          borderWidth: 1,
          borderColor: COLORS.grayMedium,
          height: 42,
          paddingHorizontal: 12,
        }}
        onPress={isAircraftEditable ? toggleRPCDropdown : null}
      >
        <AppText
          style={{
            fontSize: 12,
            color: formData.rpc ? COLORS.black : COLORS.grayDark,
          }}
        >
          {formData.rpc || "Select RP/C"}
        </AppText>
        {isAircraftEditable && (
          <MaterialCommunityIcons
            name={showRPCDropdown ? "chevron-up" : "chevron-down"}
            size={20}
            color={COLORS.grayDark}
          />
        )}
      </TouchableOpacity>

      {showRPCDropdown && isAircraftEditable && (
        <View
          style={{
            marginTop: 6,
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
            maxHeight: 240,
          }}
        >
          <ScrollView
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {dynamicRpcOptions.map((rpc, index) => (
              <TouchableOpacity
                key={index}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderBottomWidth:
                    index < dynamicRpcOptions.length - 1 ? 1 : 0,
                  borderBottomColor: COLORS.grayLight,
                  backgroundColor:
                    formData.rpc === rpc
                      ? COLORS.primaryLight + "10"
                      : COLORS.white,
                }}
                onPress={() => {
                  updateForm("rpc", rpc);
                  resolveAircraftTypeByRpc(rpc);
                  setShowRPCDropdown(false);
                }}
              >
                <AppText
                  style={{
                    fontSize: 12,
                    color:
                      formData.rpc === rpc ? COLORS.primaryLight : COLORS.black,
                  }}
                >
                  {rpc}
                </AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  return (
    <View>
      <AppText
        style={{
          fontSize: 14,
          fontWeight: "600",
          color: COLORS.grayDark,
          marginBottom: 16,
        }}
      >
        Basic Information
      </AppText>

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
          overflow: "visible",
        }}
      >
        <View
          style={{
            backgroundColor: COLORS.primaryLight,
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
          }}
        >
          <AppText
            style={{ fontSize: 14, color: COLORS.white, fontWeight: "600" }}
          >
            {aircraftClassLabel}
          </AppText>
        </View>

        <View style={{ padding: 20 }}>
          <View style={{ marginBottom: 16 }}>
            <AppText
              style={{
                fontSize: 12,
                color: COLORS.black,
                marginBottom: 6,
                fontWeight: "500",
              }}
            >
              RP-C: *
            </AppText>
            {renderRPCDropdown()}
          </View>

          <View style={{ marginBottom: 16 }}>
            <AppText
              style={{
                fontSize: 12,
                color: COLORS.black,
                marginBottom: 6,
                fontWeight: "500",
              }}
            >
              Aircraft Type: *
            </AppText>
            {renderAircraftTypeField()}
          </View>

          <View style={{ marginBottom: 16 }}>
            <AppText
              style={{
                fontSize: 12,
                color: COLORS.black,
                marginBottom: 6,
                fontWeight: "500",
              }}
            >
              Date:
            </AppText>
            <DateInput
              value={formData.date}
              onChangeText={(date) => updateForm("date", date)}
              editable={isEditable}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
