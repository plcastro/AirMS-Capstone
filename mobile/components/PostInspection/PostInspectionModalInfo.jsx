import React, { useEffect, useRef, useState } from "react";
import AppText from "../common/AppText";
import AppInput from "../common/AppInput";
import { View } from "react-native";
import { COLORS } from "../../stylesheets/colors";
import { API_BASE } from "../../utilities/API_BASE";
import { isB412Aircraft } from "./b412PostInspectionData";
import DateInput from "../common/DateInput";
import InlineDropdown from "../common/InlineDropdown";
import FlightLogCrewAssignment from "../FlightLog/FlightLogCrewAssignment";

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
          backgroundColor: COLORS.grayLight,
          borderRadius: 8,
          height: 48,
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
    <InlineDropdown
      value={formData.rpc}
      placeholder="Select RP/C"
      disabled={!isAircraftEditable}
      open={showRPCDropdown}
      onToggle={toggleRPCDropdown}
      onChange={(rpc) => {
        updateForm("rpc", rpc);
        resolveAircraftTypeByRpc(rpc);
        setShowRPCDropdown(false);
      }}
      options={dynamicRpcOptions.map((rpc) => ({ label: rpc, value: rpc }))}
      menuMaxHeight={240}
    />
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
          <AppText style={{ marginBottom: 12 }}>Linked Flight Log: {formData.flightLogControlNo || formData.flightLogId || "Not linked"}</AppText>
          <FlightLogCrewAssignment formData={formData} updateForm={updateForm} canAssign={false} isActive={false} />
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
