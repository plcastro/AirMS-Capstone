import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../stylesheets/colors";

const getStatusStyle = (status) => {
  switch (status?.toLowerCase()) {
    case "pending":
      return {
        label: "Pending",
        backgroundColor: "#E3F2FD",
        textColor: "#1565C0",
      };
    case "approved":
      return {
        label: "Approved",
        backgroundColor: "#E0F7FA",
        textColor: "#00838F",
      };
    case "in progress":
      return {
        label: "In Progress",
        backgroundColor: "#FFF3E0",
        textColor: "#EF6C00",
      };
    case "completed":
      return {
        label: "Completed",
        backgroundColor: "#E8F5E9",
        textColor: "#2E7D32",
      };
    case "rejected":
    case "cancelled":
      return {
        label: status?.toLowerCase() === "rejected" ? "Rejected" : "Cancelled",
        backgroundColor: "#FDECEC",
        textColor: "#C62828",
      };
    default:
      return {
        label: status || "Unknown",
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
  hideActions = false,
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
        }}
      >
        <MaterialCommunityIcons
          name="progress-clock"
          size={48}
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
          <View
            key={item.id}
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
                {item.slipNo}
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
                {item.formattedDateRequested || item.dateRequested}
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
                    Aircraft: {item.aircraft || "-"}
                  </Text>
                </View>
                <View style={{ marginBottom: 6 }}>
                  <Text style={{ color: "#555", fontSize: 14 }}>
                    Requested By: {item.requestedBy || "-"}
                  </Text>
                </View>
                <View style={{ marginBottom: 6 }}>
                  <Text style={{ color: "#555", fontSize: 14 }}>
                    Items: {item.itemSummary}
                  </Text>
                </View>
                <View style={{ marginBottom: 6 }}>
                  <Text style={{ color: "#555", fontSize: 14 }}>
                    Total Qty: {item.totalQuantityLabel || item.totalQuantity || 0}
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: hideActions ? "center" : "space-between",
                    alignItems: "center",
                    marginTop: 10,
                  }}
                >
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => onViewDetails?.(item)}
                    style={{
                      backgroundColor: COLORS.primaryLight,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: COLORS.white,
                        fontSize: 14,
                        fontWeight: "600",
                      }}
                    >
                      View Request Details
                    </Text>
                  </TouchableOpacity>

                  {!hideActions && (
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => onEdit?.(item)}
                        style={{ padding: 4, marginRight: 2 }}
                      >
                        <MaterialCommunityIcons
                          name="pencil"
                          size={20}
                          color="#777"
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => onDelete?.(item)}
                        style={{ padding: 4 }}
                      >
                        <MaterialCommunityIcons
                          name="delete"
                          size={20}
                          color="#F45B5B"
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </>
  );
}
