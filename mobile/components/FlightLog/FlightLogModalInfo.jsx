import React, { useState, useEffect, useRef } from "react";
import AppText from "../common/AppText";
import AppInput from "../common/AppInput";
import { View, TouchableOpacity, ScrollView } from "react-native";
import { COLORS } from "../../stylesheets/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { API_BASE } from "../../utilities/API_BASE";

export default function FlightLogModalInfo({
  formData,
  updateForm,
  isEditable = true,
  isRPCEditable = true,
  isActive = true,
  onAircraftDataLoaded,
  isB412 = false,
  serialNumber = "",
  onUpdateSerialNumber,
}) {
  const [showRPCDropdown, setShowRPCDropdown] = useState(false);
  const [aircraftOptions, setAircraftOptions] = useState([]);
  const [ongoingAircraftRpcs, setOngoingAircraftRpcs] = useState([]);
  const aircraftDetailRequestRef = useRef(0);
  const canEditRPC = isEditable && isRPCEditable;
  const normalizeRpc = (value = "") =>
    String(value || "")
      .trim()
      .toUpperCase();

  const normalizeAircraftOptions = (payload) => {
    const source = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload)
        ? payload
        : [];

    return [
      ...new Set(
        source
          .map((item) =>
            typeof item === "string"
              ? item
              : item?.tailNum || item?.aircraft || item?.rpc || "",
          )
          .map(normalizeRpc)
          .filter(Boolean),
      ),
    ].sort();
  };

  const fetchAircraftOptions = async () => {
    try {
      const [partsResult, aircraftResult, aircraftWithBasesResult] =
        await Promise.allSettled([
          fetch(`${API_BASE}/api/parts-monitoring/aircraft-list`).then(
            (response) => response.json(),
          ),
          fetch(`${API_BASE}/api/aircraft/aircraft-tail-numbers`).then(
            (response) => response.json(),
          ),
          fetch(`${API_BASE}/api/aircraft/aircraft-with-bases`).then(
            (response) => response.json(),
          ),
        ]);
      const partsData =
        partsResult.status === "fulfilled" ? partsResult.value : null;
      const aircraftData =
        aircraftResult.status === "fulfilled" ? aircraftResult.value : null;
      const aircraftWithBasesData =
        aircraftWithBasesResult.status === "fulfilled"
          ? aircraftWithBasesResult.value
          : null;
      const options = [
        ...normalizeAircraftOptions(partsData),
        ...normalizeAircraftOptions(aircraftData),
        ...normalizeAircraftOptions(aircraftWithBasesData),
      ];

      setAircraftOptions([...new Set(options)].sort());
    } catch (error) {
      console.error("Error fetching aircraft options:", error);
      setAircraftOptions([]);
    }
  };

  useEffect(() => {
    fetchAircraftOptions();

    return () => {
      aircraftDetailRequestRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!normalizeRpc(formData.rpc)) {
      aircraftDetailRequestRef.current += 1;
    }
  }, [formData.rpc]);

  useEffect(() => {
    if (!isActive) {
      aircraftDetailRequestRef.current += 1;
      setShowRPCDropdown(false);
    }
  }, [isActive]);

  useEffect(() => {
    const fetchOngoingAircraftRpcs = async () => {
      try {
        const statuses = ["pending_release", "pending_acceptance", "accepted"];
        const responses = await Promise.all(
          statuses.map((status) =>
            fetch(
              `${API_BASE}/api/flightlogs?page=1&limit=300&status=${status}`,
            ),
          ),
        );
        const payloads = await Promise.all(
          responses.map((response) => response.json()),
        );

        const nextOngoingAircraft = payloads.flatMap((payload, index) =>
          responses[index].ok && Array.isArray(payload.data)
            ? payload.data.map((log) => normalizeRpc(log.rpc)).filter(Boolean)
            : [],
        );

        setOngoingAircraftRpcs([...new Set(nextOngoingAircraft)]);
      } catch (error) {
        console.error("Error fetching ongoing aircraft options:", error);
      }
    };

    fetchOngoingAircraftRpcs();
  }, []);

  const aircraftDropdownOptions = aircraftOptions.map((rpc) => {
    const normalizedRpc = normalizeRpc(rpc);
    const currentRpc = normalizeRpc(formData.rpc);

    return {
      disabled:
        ongoingAircraftRpcs.includes(normalizedRpc) &&
        normalizedRpc !== currentRpc,
      rpc,
    };
  });

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
    if (canEditRPC) {
      setShowRPCDropdown(!showRPCDropdown);
    }
  };

  const renderAircraftType = () => (
    <View>
      <AppInput
        style={{
          backgroundColor: isEditable ? "#F2F2F2" : "#E8E8E8",
          borderRadius: 6,
          height: 42,
          paddingHorizontal: 12,
          fontSize: 12,
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
          backgroundColor: canEditRPC ? "#F8F8F8" : "#E8E8E8",
          borderRadius: 6,
          borderWidth: 1,
          borderColor: COLORS.grayMedium,
          height: 42,
          paddingHorizontal: 12,
        }}
        onPress={canEditRPC ? toggleRPCDropdown : null}
      >
        <AppText
          style={{
            fontSize: 12,
            color: formData.rpc ? COLORS.black : COLORS.grayDark,
          }}
        >
          {formData.rpc || "Select RP-C"}
        </AppText>
        {canEditRPC && (
          <MaterialCommunityIcons
            name={showRPCDropdown ? "chevron-up" : "chevron-down"}
            size={20}
            color={COLORS.grayDark}
          />
        )}
      </TouchableOpacity>

      {showRPCDropdown && canEditRPC && (
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
            {aircraftDropdownOptions.length === 0 && (
              <View style={{ paddingVertical: 12, paddingHorizontal: 12 }}>
                <AppText style={{ fontSize: 12, color: COLORS.grayDark }}>
                  No aircraft found
                </AppText>
              </View>
            )}
            {aircraftDropdownOptions.map(({ disabled, rpc }, index) => (
              <TouchableOpacity
                key={rpc}
                disabled={disabled}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderBottomWidth:
                    index < aircraftDropdownOptions.length - 1 ? 1 : 0,
                  borderBottomColor: COLORS.grayLight,
                  backgroundColor:
                    formData.rpc === rpc
                      ? COLORS.primaryLight + "10"
                      : COLORS.white,
                  opacity: disabled ? 0.55 : 1,
                }}
                onPress={() => {
                  if (
                    normalizeRpc(formData.rpc) === normalizeRpc(rpc) &&
                    String(formData.aircraftType || "").trim()
                  ) {
                    setShowRPCDropdown(false);
                    return;
                  }

                  updateForm("rpc", rpc);
                  updateForm("aircraftType", "");
                  onAircraftDataLoaded?.(null);
                  setShowRPCDropdown(false);
                  const requestToken = aircraftDetailRequestRef.current + 1;
                  aircraftDetailRequestRef.current = requestToken;

                  const fetchAircraftType = async () => {
                    try {
                      const response = await fetch(
                        `${API_BASE}/api/parts-monitoring/${encodeURIComponent(rpc)}`,
                      );
                      const data = await response.json();

                      if (requestToken !== aircraftDetailRequestRef.current) {
                        return;
                      }

                      if (response.ok) {
                        updateForm("aircraftType", data.data.aircraftType);
                        onAircraftDataLoaded?.(data.data);
                        console.log(data.data);
                      }
                    } catch (error) {
                      if (requestToken !== aircraftDetailRequestRef.current) {
                        return;
                      }

                      console.error("Error fetching aircraft type:", error);
                      onAircraftDataLoaded?.(null);
                    }
                  };

                  fetchAircraftType();
                }}
              >
                <AppText
                  style={{
                    fontSize: 12,
                    color: disabled
                      ? COLORS.grayDark
                      : formData.rpc === rpc
                        ? COLORS.primaryLight
                        : COLORS.black,
                  }}
                >
                  {disabled ? `${rpc} (ongoing flight log)` : rpc}
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
          fontSize: 12,
          fontWeight: "700",
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
                : "Rotary Winged Aircraft"}
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
            {renderAircraftType()}
          </View>

          {isB412 && (
            <View style={{ marginBottom: 16 }}>
              <AppText
                style={{
                  fontSize: 12,
                  color: COLORS.black,
                  marginBottom: 6,
                  fontWeight: "500",
                }}
              >
                Serial No.:
              </AppText>
              <AppInput
                style={{
                  backgroundColor: isEditable ? "#F2F2F2" : "#E8E8E8",
                  borderRadius: 6,
                  height: 42,
                  paddingHorizontal: 12,
                  fontSize: 12,
                  color: isEditable ? COLORS.black : COLORS.grayDark,
                }}
                value={serialNumber}
                onChangeText={onUpdateSerialNumber}
                editable={isEditable}
              />
            </View>
          )}

          <View style={{ marginBottom: 16 }}>
            <AppText
              style={{
                fontSize: 12,
                color: COLORS.black,
                marginBottom: 6,
                fontWeight: "500",
              }}
            >
              Date: *
            </AppText>
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
              <AppText style={{ fontSize: 12, color: COLORS.grayDark }}>
                {formatDate(formData.date)}
              </AppText>
              <MaterialCommunityIcons
                name="calendar-blank"
                size={18}
                color={COLORS.grayDark}
              />
            </View>
          </View>

          <View style={{ marginBottom: 8 }}>
            <AppText
              style={{
                fontSize: 12,
                color: COLORS.black,
                marginBottom: 6,
                fontWeight: "500",
              }}
            >
              Control No.: *
            </AppText>
            <AppInput
              style={{
                backgroundColor: isEditable ? "#F2F2F2" : "#E8E8E8",
                borderRadius: 6,
                height: 42,
                paddingHorizontal: 12,
                fontSize: 12,
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
