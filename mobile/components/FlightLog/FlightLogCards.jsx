import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { COLORS } from "../../stylesheets/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function FlightLogCards({ logs, onEdit, onExport, userRole }) {
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

  const getStatusBadgeStyle = (status) => {
    if (status === "completed") {
      return {
        backgroundColor: "#E8F5E9",
        textColor: "#2E7D32",
        label: "Completed",
      };
    }
    // pending_release, pending_acceptance, ongoing all show as "Ongoing"
    return {
      backgroundColor: "#FFF3E0",
      textColor: "#ED6C02",
      label: "Ongoing",
    };
  };

  if (!logs || logs.length === 0) {
    return (
      <View
        style={{
          backgroundColor: COLORS.white,
          borderRadius: 4,
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
          name="file-document-outline"
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
          No flight logs found
        </Text>
      </View>
    );
  }

  return (
    <>
      {logs.map((log) => {
        const statusStyle = getStatusBadgeStyle(log.status);

        return (
          <View
            key={log._id}
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
                RP/C: {log.rpc || "N/A"}
              </Text>
              <View
                style={{ flexDirection: "row", gap: 12, alignItems: "center" }}
              >
                {/* Status Badge */}
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
                <TouchableOpacity onPress={() => onExport?.(log)}>
                  <MaterialCommunityIcons
                    name="export-variant"
                    size={22}
                    color={COLORS.white}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View
              style={{
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 8,
              }}
            >
              <Text style={{ color: "#777", fontSize: 14, fontWeight: "500" }}>
                {formatDate(log.dateAdded || log.date)}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onEdit(log)}
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
                    Aircraft Type : {log.aircraftType || "N/A"}
                  </Text>
                </View>
                <View style={{ marginBottom: 6 }}>
                  <Text style={{ color: "#555", fontSize: 14 }}>
                    RP-C: {log.rpc || "N/A"}
                  </Text>
                </View>
                <View style={{ marginBottom: 6 }}>
                  <Text style={{ color: "#555", fontSize: 14 }}>
                    Control: {log.control || "N/A"}
                  </Text>
                </View>
                {/* Created By Badge */}
                <View
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                  }}
                >
                  <View
                    style={{
                      backgroundColor:
                        log.createdBy === "pilot" ? "#E3F2FD" : "#F3E5F5",
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        color:
                          log.createdBy === "pilot" ? "#1976D2" : "#7B1FA2",
                        fontWeight: "500",
                      }}
                    >
                      {log.createdBy === "pilot"
                        ? "Pilot Created"
                        : "Mechanic Created"}
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    position: "absolute",
                    bottom: 10,
                    right: 10,
                  }}
                >
                  <MaterialCommunityIcons
                    name="pencil"
                    size={20}
                    color="#777"
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
