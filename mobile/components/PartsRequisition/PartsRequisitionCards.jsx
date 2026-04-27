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
          shadowColor: COLORS.black,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
        }}
      >
        <MaterialCommunityIcons
          name="progress-clock"
          size={56}
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
            activeOpacity={0.75}
            onPress={() => onViewDetails?.(item)}
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
                Warehouse Slips
              </Text>
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
                    fontSize: 11,
                    fontWeight: "600",
                  }}
                >
                  {statusStyle.label}
                </Text>
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
                {item.dateRequested}
              </Text>
            </View>

            <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              <View
                style={{
                  backgroundColor: "#F5F5F5",
                  borderWidth: 1,
                  borderColor: "#E0E0E0",
                  borderRadius: 5,
                  padding: 15,
                }}
              >
                <View style={{ marginBottom: 6 }}>
                  <Text style={{ color: "#555", fontSize: 14 }}>
                    Slip No: {item.slipNo}
                  </Text>
                </View>
                <View style={{ marginBottom: 6 }}>
                  <Text style={{ color: "#555", fontSize: 14 }}>
                    Particular and Quantity: {item.itemSummary}
                  </Text>
                </View>
                <View style={{ marginBottom: 6 }}>
                  <Text style={{ color: "#555", fontSize: 14 }}>
                    Purpose: {item.purpose}
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    marginTop: 10,
                  }}
                >
                  {showActions && (
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <TouchableOpacity
                        activeOpacity={actionsDisabled ? 1 : 0.7}
                        onPress={() => onEdit?.(item)}
                        disabled={actionsDisabled}
                        style={{ padding: 4, marginRight: 2 }}
                      >
                        <MaterialCommunityIcons
                          name="pencil"
                          size={20}
                          color={actionsDisabled ? "#C8C8C8" : "#777"}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={actionsDisabled ? 1 : 0.7}
                        onPress={() => onDelete?.(item)}
                        disabled={actionsDisabled}
                        style={{ padding: 4 }}
                      >
                        <MaterialCommunityIcons
                          name="delete"
                          size={20}
                          color={actionsDisabled ? "#F1B6B6" : "#F45B5B"}
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </>
  );
}
