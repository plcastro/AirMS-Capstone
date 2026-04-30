import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../stylesheets/colors";

const getStatusStyle = (status) => {
  switch (status?.toLowerCase()) {
    case "parts requested":
      return {
        label: "Parts Requested",
        backgroundColor: "#F1F1F1",
        textColor: "#666666",
      };
    case "to be ordered":
      return {
        label: "To Be Restocked",
        backgroundColor: "#FFF4E5",
        textColor: "#C26A00",
      };
    case "availability checked":
      return {
        label: "Availability Checked",
        backgroundColor: "#FFF8E1",
        textColor: "#A37300",
      };
    case "ordered":
      return {
        label: "Restocked",
        backgroundColor: "#E3F2FD",
        textColor: "#1565C0",
      };
    case "approved":
      return {
        label: "Approved",
        backgroundColor: "#E8F5E9",
        textColor: "#2E7D32",
      };
    case "delivered":
      return {
        label: "Delivered",
        backgroundColor: "#F3E5F5",
        textColor: "#7B1FA2",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        backgroundColor: "#FDECEC",
        textColor: "#C62828",
      };
    default:
      return {
        label: status || "Pending",
        backgroundColor: "#F1F1F1",
        textColor: "#666666",
      };
  }
};
export default function PartsRequisitionCards({
  requisitions,
  onViewDetails,
  onEdit,
  onDelete,
  showActions = true,
  actionsDisabled = false,
  loading = false,
}) {
  const formatLogbookDate = (value) => {
    if (!value) return "N/A";

    const date = new Date(value);
    if (isNaN(date.getTime())) return "N/A";

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
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
          name="progress-clock"
          size={56}
          color={COLORS.grayMedium}
        />
        <Text style={{ fontSize: 12, marginTop: 12 }}>
          Loading parts requisitions...
        </Text>
      </View>
    );
  }

  if (!requisitions || requisitions.length === 0) {
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
          name="file-document-outline"
          size={60}
          color={COLORS.grayMedium}
        />
        <Text style={{ fontSize: 12, marginTop: 12 }}>
          No parts requisitions found
        </Text>
      </View>
    );
  }

  return (
    <>
      {requisitions.map((item) => {
        const statusStyle = getStatusStyle(item.status);

        return (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.8}
            onPress={() => onViewDetails?.(item)}
            style={{
              flexDirection: "row",
              backgroundColor: COLORS.white,
              borderRadius: 10,
              marginBottom: 14,
              elevation: 3,
              overflow: "hidden",
            }}
          >
            {/* ✅ LEFT ACCENT BAR */}
            <View
              style={{
                width: 5,
                backgroundColor: COLORS.primaryLight,
              }}
            />

            <View style={{ flex: 1 }}>
              {/* ✅ HEADER (compact like flight log) */}
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
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    Warehouse Slip
                  </Text>
                  <Text style={{ fontSize: 10, color: "#777" }}>
                    {item.dateRequested}
                  </Text>
                </View>

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
              </View>

              {/* ✅ BODY (compact info, no gray box) */}
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingBottom: 12,
                }}
              >
                <Text style={{ fontSize: 11, color: "#444" }}>
                  <Text style={{ color: "#777" }}>Slip No:</Text>{" "}
                  {item.slipNo || "N/A"}
                </Text>

                <Text style={{ fontSize: 11, color: "#444" }}>
                  <Text style={{ color: "#777" }}>Items:</Text>{" "}
                  {item.itemSummary || "N/A"}
                </Text>

                <Text style={{ fontSize: 11, color: "#444" }}>
                  <Text style={{ color: "#777" }}>Purpose:</Text>{" "}
                  {item.purpose || "N/A"}
                </Text>
              </View>

              {/* ✅ ACTIONS (aligned right like you asked earlier) */}
              {showActions && (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    paddingHorizontal: 10,
                    paddingBottom: 10,
                    gap: 8,
                  }}
                >
                  <TouchableOpacity
                    activeOpacity={actionsDisabled ? 1 : 0.7}
                    onPress={() => onEdit?.(item)}
                    disabled={actionsDisabled}
                  >
                    <MaterialCommunityIcons
                      name="pencil"
                      size={18}
                      color={actionsDisabled ? "#C8C8C8" : "#777"}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={actionsDisabled ? 1 : 0.7}
                    onPress={() => onDelete?.(item)}
                    disabled={actionsDisabled}
                  >
                    <MaterialCommunityIcons
                      name="delete"
                      size={18}
                      color={actionsDisabled ? "#F1B6B6" : "#F45B5B"}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </>
  );
}
