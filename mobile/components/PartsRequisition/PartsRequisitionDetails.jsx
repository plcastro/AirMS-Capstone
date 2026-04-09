import React from "react";
import { Modal, ScrollView, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../stylesheets/colors";

const getOverallStatusStyle = (status) => {
  switch (status?.toLowerCase()) {
    case "approved":
      return {
        borderColor: "#2F8CFF",
        textColor: "#2F8CFF",
      };
    case "in progress":
    case "ready for pickup":
      return {
        borderColor: "#1565C0",
        textColor: "#1565C0",
      };
    case "completed":
      return {
        borderColor: "#2E7D32",
        textColor: "#2E7D32",
      };
    case "rejected":
    case "cancelled":
      return {
        borderColor: "#C62828",
        textColor: "#C62828",
      };
    default:
      return {
        borderColor: COLORS.grayMedium,
        textColor: COLORS.grayDark,
      };
  }
};

const getTimelineBadgeStyle = (status) => {
  switch (status?.toLowerCase()) {
    case "approved":
      return {
        borderColor: "#69AFFF",
        textColor: "#2F8CFF",
      };
    case "in progress":
    case "ready for pickup":
      return {
        borderColor: "#90CAF9",
        textColor: "#1565C0",
      };
    case "completed":
      return {
        borderColor: "#81C784",
        textColor: "#2E7D32",
      };
    case "rejected":
    case "cancelled":
      return {
        borderColor: "#EF9A9A",
        textColor: "#C62828",
      };
    default:
      return {
        borderColor: "#B8B8B8",
        textColor: "#666666",
      };
  }
};

export default function PartsRequisitionDetails({
  visible,
  onClose,
  request,
  showReviewActions = false,
  onApprove,
  onReject,
}) {
  if (!request) return null;

  const overallStatusStyle = getOverallStatusStyle(request.overallStatus);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.35)",
          justifyContent: "center",
          paddingHorizontal: 12,
          paddingVertical: 16,
        }}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor="rgba(0, 0, 0, 0.35)"
        />

        <View
          style={{
            backgroundColor: COLORS.white,
            borderRadius: 20,
            overflow: "hidden",
            elevation: 8,
            shadowColor: COLORS.black,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.18,
            shadowRadius: 10,
            maxHeight: "92%",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: "#E8E8E8",
            }}
          >
            <Text
              style={{
                fontSize: 24,
                fontWeight: "600",
                color: COLORS.black,
              }}
            >
              Request Details
            </Text>

            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={COLORS.grayDark}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: 20,
            }}
          >
            <View style={{ alignItems: "center", marginBottom: 18 }}>
              <Text
                style={{
                  fontSize: 16,
                  color: COLORS.grayDark,
                  marginBottom: 8,
                }}
              >
                Overall Request Status:
              </Text>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: overallStatusStyle.borderColor,
                  borderRadius: 20,
                  paddingHorizontal: 18,
                  paddingVertical: 6,
                }}
              >
                <Text
                  style={{
                    color: overallStatusStyle.textColor,
                    fontSize: 18,
                    fontWeight: "500",
                  }}
                >
                  {request.overallStatus === "In Progress"
                    ? "Ready for Pickup"
                    : request.overallStatus}
                </Text>
              </View>
            </View>

            <View style={{ marginBottom: 18 }}>
              {[
                ["Request ID", request.requestId],
                ["Request Date", request.requestDate],
                ["Requested By", request.requestedBy],
                ["Total Items", String(request.totalItems)],
                ["Total Quantity", request.totalQuantity],
              ].map(([label, value]) => (
                <View key={label} style={{ marginBottom: 10 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      color: COLORS.grayDark,
                      marginBottom: 2,
                    }}
                  >
                    {label}
                  </Text>
                  <Text
                    style={{
                      fontSize: 18,
                      color: COLORS.black,
                      fontWeight: "700",
                    }}
                  >
                    {value}
                  </Text>
                </View>
              ))}
            </View>

            <Text
              style={{
                fontSize: 24,
                fontWeight: "700",
                color: "#333333",
                marginBottom: 12,
              }}
            >
              Request Items
            </Text>

            <View
              style={{
                borderWidth: 1,
                borderColor: "#E4E4E4",
                borderRadius: 6,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 16,
              }}
            >
              {request.requestItems.map((item, index) => {
                const badgeStyle = getTimelineBadgeStyle(item.status);

                return (
                  <View
                    key={`${item.itemName}-${index}`}
                    style={{
                      marginBottom:
                        index < request.requestItems.length - 1 ? 16 : 0,
                    }}
                  >
                    <View style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 16, color: COLORS.grayDark }}>
                        Item Name
                      </Text>
                      <Text
                        style={{
                          fontSize: 18,
                          color: COLORS.black,
                          fontWeight: "700",
                        }}
                      >
                        {item.itemName}
                      </Text>
                    </View>

                    <View style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 16, color: COLORS.grayDark }}>
                        Purpose
                      </Text>
                      <Text
                        style={{
                          fontSize: 18,
                          color: COLORS.black,
                          fontWeight: "700",
                        }}
                      >
                        {item.purpose}
                      </Text>
                    </View>

                    <View style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 16, color: COLORS.grayDark }}>
                        Requested
                      </Text>
                      <Text
                        style={{
                          fontSize: 18,
                          color: COLORS.black,
                          fontWeight: "700",
                        }}
                      >
                        {item.requested}
                      </Text>
                    </View>

                    <View>
                      <Text
                        style={{
                          fontSize: 16,
                          color: COLORS.grayDark,
                          marginBottom: 5,
                        }}
                      >
                        Status
                      </Text>
                      <View
                        style={{
                          alignSelf: "flex-start",
                          borderWidth: 1,
                          borderColor: badgeStyle.borderColor,
                          borderRadius: 20,
                          paddingHorizontal: 12,
                          paddingVertical: 4,
                        }}
                      >
                        <Text
                          style={{
                            color: badgeStyle.textColor,
                            fontSize: 18,
                          }}
                        >
                          {item.status === "In Progress"
                            ? "Ready for Pickup"
                            : item.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            <Text
              style={{
                fontSize: 24,
                fontWeight: "700",
                color: "#333333",
                marginBottom: 10,
              }}
            >
              Notes
            </Text>
            <View
              style={{
                backgroundColor: "#F1F1F1",
                borderRadius: 6,
                minHeight: 44,
                paddingHorizontal: 12,
                paddingVertical: 12,
                marginBottom: 18,
              }}
            >
              <Text style={{ fontSize: 18, color: COLORS.grayDark }}>
                {request.notes || ""}
              </Text>
            </View>

            <Text
              style={{
                fontSize: 24,
                fontWeight: "700",
                color: "#333333",
                marginBottom: 12,
              }}
            >
              Request Timeline
            </Text>

            {request.timeline.map((entry, index) => {
              const badgeStyle = getTimelineBadgeStyle(entry.status);

              return (
                <View
                  key={`${entry.status}-${index}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    marginBottom: 18,
                  }}
                >
                  <MaterialCommunityIcons
                    name="check-circle-outline"
                    size={24}
                    color={COLORS.primaryLight}
                    style={{ marginRight: 10, marginTop: 2 }}
                  />

                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        alignSelf: "flex-start",
                        borderWidth: 1,
                        borderColor: badgeStyle.borderColor,
                        borderRadius: 20,
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                        marginBottom: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: badgeStyle.textColor,
                          fontSize: 18,
                        }}
                      >
                        {entry.status === "In Progress"
                          ? "Ready for Pickup"
                          : entry.status}
                      </Text>
                    </View>

                    <Text
                      style={{
                        fontSize: 16,
                        color: COLORS.grayDark,
                        marginBottom: 2,
                      }}
                    >
                      {entry.dateTime}
                    </Text>
                    <Text
                      style={{
                        fontSize: 18,
                        color: COLORS.black,
                        fontWeight: "700",
                        marginBottom: 2,
                      }}
                    >
                      {entry.by}
                    </Text>
                    <Text style={{ fontSize: 18, color: COLORS.grayDark }}>
                      {entry.description}
                    </Text>
                  </View>
                </View>
              );
            })}

            {showReviewActions && (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 8,
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => onReject?.(request)}
                  style={{
                    backgroundColor: COLORS.white,
                    borderWidth: 1,
                    borderColor: "#E85D5D",
                    paddingHorizontal: 18,
                    paddingVertical: 12,
                    borderRadius: 6,
                  }}
                >
                  <Text
                    style={{
                      color: "#E85D5D",
                      fontSize: 16,
                      fontWeight: "600",
                    }}
                  >
                    Reject
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => onApprove?.(request)}
                  style={{
                    backgroundColor: COLORS.primaryLight,
                    paddingHorizontal: 18,
                    paddingVertical: 12,
                    borderRadius: 6,
                  }}
                >
                  <Text
                    style={{
                      color: COLORS.white,
                      fontSize: 16,
                      fontWeight: "600",
                    }}
                  >
                    Approve
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
