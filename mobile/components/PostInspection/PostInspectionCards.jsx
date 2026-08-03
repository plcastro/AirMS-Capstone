import React, { useState } from "react";
import AppText from "../common/AppText";
import {
  View,
  TouchableOpacity
} from "react-native";
import { COLORS } from "../../stylesheets/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ActionIconButton from "../common/ActionIconButton";
import { CardActionRow } from "../common/MobileModule";

export default function PostInspectionCards({
  inspections,
  onEdit,
  onExport,
  userRole,
}) {
  const [exportingInspectionId, setExportingInspectionId] = useState(null);

  const handleExportPress = async (inspection) => {
    if (!onExport || exportingInspectionId) return;
    const key = inspection?._id || inspection?.id;
    if (!key) {
      await onExport(inspection);
      return;
    }
    setExportingInspectionId(String(key));
    try {
      await Promise.resolve(onExport(inspection));
    } finally {
      setExportingInspectionId(null);
    }
  };

  const getDisplayStatus = (status) =>
    status === "completed"
      ? "completed"
      : status === "released"
        ? "released"
        : "pending";

  const getStatusStyle = (status) => {
    switch (getDisplayStatus(status)) {
      case "completed":
        return {
          label: "Completed",
          backgroundColor: "#E8F5E9",
          textColor: "#2E7D32",
        };
      case "released":
        return {
          label: "Released",
          backgroundColor: "#E3F2FD",
          textColor: "#1565C0",
        };
      default:
        return {
          label: "Pending Release",
          backgroundColor: "#FFF3E0",
          textColor: "#ED6C02",
        };
    }
  };

  if (!inspections || inspections.length === 0) {
    return (
      <View
        style={{
          backgroundColor: COLORS.white,
          borderRadius: 20,
          padding: 40,
          alignItems: "center",
          marginTop: 20,
          elevation: 8,
        }}
      >
        <MaterialCommunityIcons
          name="clipboard-list-outline"
          size={60}
          color={COLORS.grayMedium}
        />
        <AppText style={{ fontSize: 12, marginTop: 12 }}>
          No post-inspections found
        </AppText>
      </View>
    );
  }

  return (
    <>
      {inspections.map((inspection) => {
        const statusStyle = getStatusStyle(inspection.status);
        const isOfficerInCharge = userRole === "officer-in-charge";
        const inspectionKey = String(inspection._id || inspection.id || "");
        const exportLoading = exportingInspectionId === inspectionKey;

        return (
          <TouchableOpacity
            key={inspection._id}
            activeOpacity={0.8}
            onPress={() => onEdit?.(inspection)}
            style={{
              flexDirection: "row",
              backgroundColor: COLORS.white,
              borderRadius: 8,
              marginBottom: 12,
              elevation: 2,
              overflow: "hidden",
            }}
          >
            {/* Accent bar */}
            <View style={{ width: 4, backgroundColor: COLORS.primaryLight }} />

            <View style={{ flex: 1, position: "relative" }}>
              {/* HEADER */}
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View>
                  <AppText style={{ fontSize: 13, fontWeight: "bold" }}>
                    {inspection.rpc || "N/A"}
                  </AppText>

                  <AppText style={{ fontSize: 10, color: "#777" }}>
                    {inspection.date || inspection.createdAt || "N/A"}
                  </AppText>
                </View>

                <View>
                  {/* Status */}
                  <View
                    style={{
                      backgroundColor: statusStyle.backgroundColor,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 12,
                    }}
                  >
                    <AppText
                      style={{
                        color: statusStyle.textColor,
                        fontSize: 9,
                        fontWeight: "600",
                      }}
                    >
                      {statusStyle.label}
                    </AppText>
                  </View>
                </View>
              </View>

              {/* BODY (compact inline style like logs) */}
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingBottom: 10,
                }}
              >
                <AppText style={{ fontSize: 11, color: "#444" }}>
                  <AppText style={{ color: "#777" }}>Aircraft:</AppText>{" "}
                  {inspection.aircraftType || "N/A"}
                </AppText>

                <AppText style={{ fontSize: 11, color: "#444" }}>
                  <AppText style={{ color: "#777" }}>Released By:</AppText>{" "}
                  {inspection?.releasedBy?.name || "N/A"}
                </AppText>
              </View>

              <CardActionRow style={{ paddingHorizontal: 10, paddingBottom: 10 }}>
                {onExport && (
                  <ActionIconButton
                    icon="export-variant"
                    tooltip="Export"
                    onPress={() => handleExportPress(inspection)}
                    disabled={Boolean(exportingInspectionId)}
                    loading={exportLoading}
                    color="#444"
                    size={32}
                    iconSize={21}
                  />
                )}
                <ActionIconButton
                  icon={isOfficerInCharge ? "eye-outline" : "pencil"}
                  tooltip={isOfficerInCharge ? "View" : "Edit"}
                  onPress={() => onEdit?.(inspection)}
                  color={isOfficerInCharge ? COLORS.primaryLight : "#777"}
                  size={32}
                  iconSize={21}
                />
              </CardActionRow>
            </View>
          </TouchableOpacity>
        );
      })}
    </>
  );
}
