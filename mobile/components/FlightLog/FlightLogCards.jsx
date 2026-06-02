import React, { useState } from "react";
import AppText from "../common/AppText";
import {
  ActivityIndicator,
  View,
  TouchableOpacity
} from "react-native";
import { COLORS } from "../../stylesheets/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function FlightLogCards({
  logs,
  onEdit,
  onExport,
  readOnly = false,
}) {
  const [exportingLogId, setExportingLogId] = useState(null);

  const handleExportPress = async (log) => {
    if (!onExport || exportingLogId) return;
    const key = log?._id || log?.id;
    if (!key) {
      await onExport(log);
      return;
    }
    setExportingLogId(String(key));
    try {
      await Promise.resolve(onExport(log));
    } finally {
      setExportingLogId(null);
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
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "pending_release":
        return {
          backgroundColor: "#FFF3E0",
          textColor: "#ED6C02",
          label: "Pending",
        };
      case "pending_acceptance":
        return {
          backgroundColor: "#E3F2FD",
          textColor: "#1565C0",
          label: "Released",
        };
      case "accepted":
        return {
          backgroundColor: "#FFF8E1",
          textColor: "#A37300",
          label: "Accepted",
        };
      case "completed":
        return {
          backgroundColor: "#E8F5E9",
          textColor: "#2E7D32",
          label: "Done",
        };
      default:
        return {
          backgroundColor: "#FFF3E0",
          textColor: "#ED6C02",
          label: "Ongoing",
        };
    }
  };

  if (!logs || logs.length === 0) {
    return (
      <View style={{ padding: 30, alignItems: "center" }}>
        <AppText>No flight logs found</AppText>
      </View>
    );
  }

  return (
    <>
      {logs.map((log) => {
        const statusStyle = getStatusBadgeStyle(log.status);
        const logKey = String(log._id || log.id || "");
        const exportLoading = exportingLogId === logKey;

        return (
          <TouchableOpacity
            key={log._id}
            activeOpacity={0.8}
            onPress={() => onEdit(log)}
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

            <View style={{ flex: 1 }}>
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
                    {log.rpc || "N/A"}
                  </AppText>
                  <AppText style={{ fontSize: 10, color: "#777" }}>
                    {formatDate(log.dateAdded || log.date)}
                  </AppText>
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

                  <TouchableOpacity
                    onPress={() => handleExportPress(log)}
                    disabled={Boolean(exportingLogId)}
                  >
                    {exportLoading ? (
                      <ActivityIndicator size="small" color="#444" />
                    ) : (
                      <MaterialCommunityIcons
                        name="export-variant"
                        size={21}
                        color="#444"
                      />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* BODY (inline instead of blocks = more compact) */}
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingBottom: 10,
                }}
              >
                <AppText style={{ fontSize: 11, color: "#444" }}>
                  <AppText style={{ color: "#777" }}>Aircraft:</AppText>{" "}
                  {log.aircraftType || "N/A"}
                </AppText>
                <AppText style={{ fontSize: 11, color: "#444" }}>
                  <AppText style={{ color: "#777" }}>Control:</AppText>{" "}
                  {log.control || "N/A"}
                </AppText>
              </View>

              {/* Icon */}
              <View
                style={{
                  position: "absolute",
                  bottom: 6,
                  right: 8,
                }}
              >
                <MaterialCommunityIcons
                  name={readOnly ? "eye-outline" : "pencil"}
                  size={21}
                  color={readOnly ? COLORS.primaryLight : "#777"}
                />
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </>
  );
}
