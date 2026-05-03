import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { COLORS } from "../../stylesheets/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function PostInspectionCards({
  inspections,
  onEdit,
  onExport,
  userRole,
}) {
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
        <Text style={{ fontSize: 12, marginTop: 12 }}>
          No post-inspections found
        </Text>
      </View>
    );
  }

  return (
    <>
      {inspections.map((inspection) => {
        const statusStyle = getStatusStyle(inspection.status);
        const isOfficerInCharge = userRole === "officer-in-charge";

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
                  <Text style={{ fontSize: 13, fontWeight: "bold" }}>
                    {inspection.rpc || "N/A"}
                  </Text>

                  <Text style={{ fontSize: 10, color: "#777" }}>
                    {inspection.date || inspection.createdAt || "N/A"}
                  </Text>
                </View>

                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  {/* Status */}
                  <View
                    style={{
                      backgroundColor: statusStyle.backgroundColor,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 12,
                    }}
                  >
                    <Text
                      style={{
                        color: statusStyle.textColor,
                        fontSize: 9,
                        fontWeight: "600",
                      }}
                    >
                      {statusStyle.label}
                    </Text>
                  </View>

                  {/* Export */}
                  <TouchableOpacity onPress={() => onExport?.(inspection)}>
                    <MaterialCommunityIcons
                      name="export-variant"
                      size={21}
                      color="#444"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* BODY (compact inline style like logs) */}
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingBottom: 10,
                }}
              >
                <Text style={{ fontSize: 11, color: "#444" }}>
                  <Text style={{ color: "#777" }}>Aircraft:</Text>{" "}
                  {inspection.aircraftType || "N/A"}
                </Text>

                <Text style={{ fontSize: 11, color: "#444" }}>
                  <Text style={{ color: "#777" }}>Released By:</Text>{" "}
                  {inspection?.releasedBy?.name || "N/A"}
                </Text>
              </View>

              {/* ICON (bottom-right like logs style) */}
              <View
                style={{
                  position: "absolute",
                  bottom: 6,
                  right: 8,
                }}
              >
                <MaterialCommunityIcons
                  name={isOfficerInCharge ? "eye-outline" : "pencil"}
                  size={21}
                  color={isOfficerInCharge ? COLORS.primaryLight : "#777"}
                />
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </>
  );
}
