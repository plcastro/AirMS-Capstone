import React, { useEffect, useRef, useState } from "react";
import AppText from "../common/AppText";
import AppInput from "../common/AppInput";
import { View } from "react-native";
import { COLORS } from "../../stylesheets/colors";
import { API_BASE } from "../../utilities/API_BASE";
import { BASE_OPTIONS } from "../UserManagement/constants";
import { isB412Aircraft } from "./b412PreInspectionData";
import DateInput from "../common/DateInput";
import InlineDropdown from "../common/InlineDropdown";
import InspectionFlightLogPicker from "./InspectionFlightLogPicker";
import FlightLogCrewAssignment from "../FlightLog/FlightLogCrewAssignment";

export default function PreInspectionModalInfo({
  formData,
  updateForm,
  isEditable = true,
  isRPCEditable = true,
  rpcOptions = [],
  isActive = true,
  showFlightLogPicker = false,
  onFlightLogChange,
}) {
  const [showRPCDropdown, setShowRPCDropdown] = useState(false);
  const [showBaseDropdown, setShowBaseDropdown] = useState(false);
  const aircraftTypeRequestRef = useRef(0);
  const fobRequestRef = useRef(0);
  const isB412 = isB412Aircraft(formData.aircraftType);
  const canEditRPC = isEditable && isRPCEditable;

  useEffect(() => () => {
    aircraftTypeRequestRef.current += 1;
    fobRequestRef.current += 1;
  }, []);

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
      if (resolvedType && resolvedType !== formData.aircraftType) {
        updateForm("aircraftType", resolvedType);
      }
    } catch (error) {
      console.error(
        "Error resolving aircraft type for pre-flight inspection:",
        error,
      );
    }
  };

  const getFlightLogDateValue = (flightLog = {}) => {
    const value = flightLog.date || flightLog.createdAt || flightLog.updatedAt;
    if (!value) return 0;

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  };

  const getLatestFlightLogFuelOnBoard = (flightLogs = []) => {
    const sortedLogs = [...flightLogs].sort(
      (left, right) =>
        getFlightLogDateValue(right) - getFlightLogDateValue(left),
    );

    for (const flightLog of sortedLogs) {
      const fuelRows = Array.isArray(flightLog.fuelServicing)
        ? [...flightLog.fuelServicing].reverse()
        : [];

      const fuelRow = fuelRows.find((row) =>
        String(row?.mainTotal || row?.mainRemG || "").trim(),
      );

      const fuelValue = fuelRow?.mainTotal || fuelRow?.mainRemG;
      const numericFuel = Number(String(fuelValue || "").replace(/,/g, ""));

      if (Number.isFinite(numericFuel) && numericFuel > 0) {
        const percent = Math.round(Math.min((numericFuel / 200) * 100, 100));
        return String(percent);
      }
    }

    return "";
  };

  const resolveFobByRpc = async (rpc, { force = false } = {}) => {
    const requestId = ++fobRequestRef.current;

    try {
      if (!rpc || (!force && String(formData.fob || "").trim())) return;

      const response = await fetch(
        `${API_BASE}/api/flightlogs/aircraft/${encodeURIComponent(rpc)}?limit=20`,
      );
      if (!response.ok) return;

      const data = await response.json();
      if (requestId !== fobRequestRef.current) return;

      const flightLogs = Array.isArray(data?.data) ? data.data : [];
      const fob = getLatestFlightLogFuelOnBoard(flightLogs);

      if (fob && (force || !String(formData.fob || "").trim())) {
        updateForm("fob", fob);
      }
    } catch (error) {
      console.error("Error resolving FOB from previous flight log:", error);
    }
  };

  useEffect(() => {
    if (formData.rpc && !formData.aircraftType) {
      resolveAircraftTypeByRpc(formData.rpc);
    }
  }, [formData.rpc]);

  useEffect(() => {
    if (formData.rpc && !String(formData.fob || "").trim()) {
      resolveFobByRpc(formData.rpc);
    }
  }, [formData.rpc]);

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
      disabled={!canEditRPC}
      open={showRPCDropdown}
      onToggle={toggleRPCDropdown}
      onChange={(rpc) => {
        updateForm("rpc", rpc);
        resolveAircraftTypeByRpc(rpc);
        resolveFobByRpc(rpc, { force: rpc !== formData.rpc });
        setShowRPCDropdown(false);
      }}
      options={dynamicRpcOptions.map((rpc) => ({ label: rpc, value: rpc }))}
      menuMaxHeight={240}
    />
  );

  const renderBaseDropdown = () => (
    <InlineDropdown
      value={formData.base}
      placeholder="Select Base"
      disabled={!isEditable}
      open={showBaseDropdown}
      onToggle={() => setShowBaseDropdown((current) => !current)}
      onChange={(base) => {
        updateForm("base", base);
        setShowBaseDropdown(false);
      }}
      options={BASE_OPTIONS.map((base) => ({ label: base, value: base }))}
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
            {isB412
              ? "Rotary Winged Aircraft - Twin Engine"
              : formData.aircraftType
                ? "Rotary Winged Aircraft - Single Engine"
                : "Aircraft Information"}
          </AppText>
        </View>

        <View style={{ padding: 20 }}>
          {showFlightLogPicker && <InspectionFlightLogPicker rpc={formData.rpc} value={formData.flightLogId} onChange={onFlightLogChange} active={isActive} />}
          {!showFlightLogPicker && <AppText style={{ marginBottom: 12 }}>Linked Flight Log: {formData.flightLogControlNo || formData.flightLogId || "Not linked"}</AppText>}
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
              RP-C: <AppText style={{ color: "red" }}>*</AppText>
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
              Aircraft Type: <AppText style={{ color: "red" }}>*</AppText>
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
              Base: <AppText style={{ color: "red" }}>*</AppText>
            </AppText>
            {renderBaseDropdown()}
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
