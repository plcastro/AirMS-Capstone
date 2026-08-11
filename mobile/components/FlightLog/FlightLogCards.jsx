import React, { useState } from "react";
import AppText from "../common/AppText";
import {
  View,
  TouchableOpacity
} from "react-native";
import { COLORS } from "../../stylesheets/colors";
import ActionIconButton from "../common/ActionIconButton";
import { CardActionRow } from "../common/MobileModule";

export default function FlightLogCards({
  logs,
  onEdit,
  onExport,
  onRelease,
  onAccept,
  onNotify,
  onComplete,
  userRole = "",
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

  const getStatusBadgeStyle = (log) => {
    const status = log?.status;
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
        if (log?.notifiedForCompletion) {
          return {
            backgroundColor: "#E6F4FF",
            textColor: "#0958D9",
            label: "For Completion",
          };
        }
        return {
          backgroundColor: "#FFF8E1",
          textColor: "#A37300",
          label: "Accepted",
        };
      case "completed":
        return {
          backgroundColor: "#E8F5E9",
          textColor: "#2E7D32",
          label: "Completed",
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
        const statusStyle = getStatusBadgeStyle(log);
        const logKey = String(log._id || log.id || "");
        const exportLoading = exportingLogId === logKey;
        const isViewOnly = readOnly || log.status === "completed";
        const normalizedRole = String(userRole || "").toLowerCase();
        const isPilot = normalizedRole === "pilot";
        const isMechanic = [
          "engineer",
          "mechanic",
          "maintenance manager",
          "superadmin",
          "head of maintenance",
        ].includes(normalizedRole);
        const canRelease =
          !readOnly && isMechanic && log.status === "pending_release";
        const canAccept =
          !readOnly &&
          isPilot &&
          ["pending_acceptance", "released"].includes(log.status);
        const canNotify =
          !readOnly &&
          isPilot &&
          log.status === "accepted" &&
          !log.notifiedForCompletion;
        const canComplete =
          !readOnly &&
          isMechanic &&
          log.status === "accepted" &&
          log.notifiedForCompletion;

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

              <CardActionRow style={{ paddingHorizontal: 10, paddingBottom: 10 }}>
                {canRelease && (
                  <ActionIconButton
                    icon="send"
                    tooltip="Release"
                    onPress={() => onRelease?.(log)}
                    color="#048A25"
                    size={32}
                    iconSize={21}
                  />
                )}
                {canAccept && (
                  <ActionIconButton
                    icon="check"
                    tooltip="Accept"
                    onPress={() => onAccept?.(log)}
                    color="#048A25"
                    size={32}
                    iconSize={21}
                  />
                )}
                {canNotify && (
                  <ActionIconButton
                    icon="bell-ring-outline"
                    tooltip="Notify"
                    onPress={() => onNotify?.(log)}
                    color="#FA8C16"
                    size={32}
                    iconSize={21}
                  />
                )}
                {canComplete && (
                  <ActionIconButton
                    icon="check-circle-outline"
                    tooltip="Complete"
                    onPress={() => onComplete?.(log)}
                    color="#048A25"
                    size={32}
                    iconSize={21}
                  />
                )}
                {onExport && (
                  <ActionIconButton
                    icon="export-variant"
                    tooltip="Export"
                    onPress={() => handleExportPress(log)}
                    disabled={Boolean(exportingLogId)}
                    loading={exportLoading}
                    color="#444"
                    size={32}
                    iconSize={21}
                  />
                )}
                <ActionIconButton
                  icon={isViewOnly ? "eye-outline" : "pencil"}
                  tooltip={isViewOnly ? "View" : "Edit"}
                  onPress={() => onEdit(log)}
                  color={isViewOnly ? COLORS.primaryLight : "#777"}
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
