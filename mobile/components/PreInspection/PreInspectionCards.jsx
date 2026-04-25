import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { COLORS } from "../../stylesheets/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function PreInspectionCards({
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

  const formatDate = (dateString) => {
    if (!dateString) return "Date not set";

    let date;

    if (dateString instanceof Date) {
      date = dateString;
    } else if (typeof dateString === "string") {
      const parts = dateString.split("/");
      if (parts.length === 3) {
        const month = parseInt(parts[0], 10) - 1;
        const day = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        date = new Date(year, month, day);
      } else {
        date = new Date(dateString);
      }
    } else if (typeof dateString === "number") {
      date = new Date(dateString);
    } else {
      return "Invalid date";
    }

    if (isNaN(date.getTime())) return "Invalid date";

    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });
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
          shadowColor: COLORS.black,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
        }}
      >
        <MaterialCommunityIcons
          name="clipboard-list-outline"
          size={60}
          color={COLORS.grayMedium}
        />
        <Text
          style={{
            color: COLORS.grayDark,
            fontSize: 16,
            marginTop: 12,
            textAlign: "center",
          }}
        >
          No pre-inspections found
        </Text>
      </View>
    );
  }

  return (
    <>
      {inspections.map((inspection) => {
        const statusStyle = getStatusStyle(inspection.status);
        const isReleased = inspection.status === "released";

        return (
          <View
            key={inspection._id}
            style={{
              backgroundColor: COLORS.white,
              borderRadius: 7,
              marginBottom: 20,
              elevation: 3,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              overflow: "hidden",
            }}
          >
            {/* Green Header with RP/C, Export Button, and Status Badge */}
            <View
              style={{
                backgroundColor: COLORS.primaryLight,
                paddingVertical: 18,
                paddingHorizontal: 20,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: COLORS.white,
                  fontSize: 18,
                  fontWeight: "600",
                }}
              >
                RP/C: {inspection.rpc || "N/A"}
              </Text>
              <View
                style={{ flexDirection: "row", gap: 12, alignItems: "center" }}
              >
                <View
                  style={{
                    backgroundColor: statusStyle.backgroundColor,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 20,
                  }}
                >
                  <Text
                    style={{
                      color: statusStyle.textColor,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    {statusStyle.label}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => onExport?.(inspection)}>
                  <MaterialCommunityIcons
                    name="export-variant"
                    size={22}
                    color={COLORS.white}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Date */}
            <View
              style={{
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 8,
              }}
            >
              <Text style={{ color: "#777", fontSize: 14, fontWeight: "500" }}>
                {formatDate(inspection.dateAdded || inspection.date)}
              </Text>
            </View>

            {/* Card Content */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onEdit(inspection)}
              style={{ paddingHorizontal: 20, paddingBottom: 20 }}
            >
              <View
                style={{
                  backgroundColor: "#F5F5F5",
                  borderWidth: 1,
                  borderColor: "#E0E0E0",
                  borderRadius: 5,
                  padding: 15,
                  position: "relative",
                }}
              >
                <View style={{ marginBottom: 6 }}>
                  <Text style={{ color: "#555", fontSize: 14 }}>
                    Aircraft Type : {inspection.aircraftType || "N/A"}
                  </Text>
                </View>
                <View style={{ marginBottom: 6 }}>
                  <Text style={{ color: "#555", fontSize: 14 }}>
                    RP/C: {inspection.rpc || "N/A"}
                  </Text>
                </View>
                <View style={{ marginBottom: 6 }}>
                  <Text style={{ color: "#555", fontSize: 14 }}>
                    Date: {formatDate(inspection.date)}
                  </Text>
                </View>

                {/* Edit Icon */}
                <View
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "flex-end",
                  }}
                >
                  <MaterialCommunityIcons
                    name={isReleased ? "eye-outline" : "pencil"}
                    size={20}
                    color={isReleased ? COLORS.primaryLight : "#777"}
                  />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        );
      })}
    </>
  );
}
