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
              borderRadius: 10,
              marginBottom: 14,
              elevation: 3,
              overflow: "hidden",
            }}
          >
            {/* LEFT ACCENT BAR */}
            <View
              style={{
                width: 5,
                backgroundColor: COLORS.primaryLight,
              }}
            />

            <View style={{ flex: 1 }}>
              {/* HEADER (MATCHES YOUR REFERENCE STYLE) */}
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
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
                    {inspection.date || inspection.createdAt}
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {/* STATUS */}
                  <View
                    style={{
                      backgroundColor: statusStyle.backgroundColor,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 12,
                    }}
                  >
                    <Text
                      style={{
                        color: statusStyle.textColor,
                        fontSize: 10,
                        fontWeight: "600",
                      }}
                    >
                      {statusStyle.label}
                    </Text>
                  </View>

                  {/* EXPORT */}
                  <TouchableOpacity onPress={() => onExport?.(inspection)}>
                    <MaterialCommunityIcons
                      name="export-variant"
                      size={18}
                      color="#444"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* BODY (NO BOX — CONSISTENT WITH SYSTEM) */}
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingBottom: 10,
                }}
              >
                <Text style={{ fontSize: 11, color: "#444" }}>
                  <Text style={{ color: "#777" }}>Aircraft Type:</Text>{" "}
                  {inspection.aircraftType || "N/A"}
                </Text>
                <Text style={{ fontSize: 11, color: "#444" }}>
                  <Text style={{ color: "#777" }}>Fuel On Board:</Text>{" "}
                  {inspection.fob !== undefined ? `${inspection.fob}%` : "N/A"}
                </Text>
              </View>

              {/* ACTION ICON (RIGHT ALIGNED LIKE ALL MODULES) */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  paddingHorizontal: 12,
                  paddingBottom: 10,
                }}
              >
                <MaterialCommunityIcons
                  name={isOfficerInCharge ? "eye-outline" : "pencil"}
                  size={18}
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
