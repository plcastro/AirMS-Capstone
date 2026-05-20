import React, { useEffect, useMemo, useState } from "react";
import AppText from "../common/AppText";
import AppInput from "../common/AppInput";
import {
  Modal,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../stylesheets/colors";

const getDisplayStatusLabel = (status) => {
  switch (status) {
    case "To Be Ordered":
      return "To Be Restocked";
    case "Ordered":
      return "Restocked";
    default:
      return status;
  }
};

const getOverallStatusStyle = (status) => {
  switch (status?.toLowerCase()) {
    case "parts requested":
      return {
        borderColor: COLORS.grayMedium,
        textColor: COLORS.grayDark,
      };
    case "to be ordered":
      return {
        borderColor: "#F0A64A",
        textColor: "#C26A00",
      };
    case "availability checked":
      return {
        borderColor: "#D4A017",
        textColor: "#A37300",
      };
    case "ordered":
      return {
        borderColor: "#1565C0",
        textColor: "#1565C0",
      };
    case "approved":
      return {
        borderColor: "#2F8CFF",
        textColor: "#2F8CFF",
      };
    case "delivered":
      return {
        borderColor: "#2E7D32",
        textColor: "#2E7D32",
      };
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
    case "parts requested":
      return {
        borderColor: "#B8B8B8",
        textColor: "#666666",
      };
    case "in stock":
      return {
        borderColor: "#81C784",
        textColor: "#2E7D32",
      };
    case "out of stock":
      return {
        borderColor: "#EF9A9A",
        textColor: "#C62828",
      };
    case "to be ordered":
      return {
        borderColor: "#F5C27B",
        textColor: "#C26A00",
      };
    case "availability checked":
      return {
        borderColor: "#F2D48D",
        textColor: "#A37300",
      };
    case "ordered":
      return {
        borderColor: "#90CAF9",
        textColor: "#1565C0",
      };
    case "approved":
      return {
        borderColor: "#69AFFF",
        textColor: "#2F8CFF",
      };
    case "delivered":
      return {
        borderColor: "#81C784",
        textColor: "#2E7D32",
      };
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
  showManagerActions = false,
  showWarehouseActions = false,
  canOrder = false,
  canApprove = false,
  orderLabel = "Order",
  approveLabel = "Approve",
  onOrder,
  onApprove,
  getItemStockStatus,
  onSubmitStockReview,
  onSaveRestock,
  onMarkRestocked,
  onMarkDelivered,
}) {
  const [availableQtyMap, setAvailableQtyMap] = useState({});
  const [persistedQtyMap, setPersistedQtyMap] = useState({});

  useEffect(() => {
    if (!request) return;

    const nextMap = {};
    (request.rawRecord?.items || []).forEach((item) => {
      nextMap[item._id] = item.availableQty ?? "";
    });
    setAvailableQtyMap(nextMap);
    setPersistedQtyMap(nextMap);
  }, [request]);

  const overallStatusStyle = getOverallStatusStyle(request?.overallStatus);
  const rawItems = request?.rawRecord?.items || [];
  const currentStatus = request?.overallStatus;
  const allQuantitiesFilled =
    rawItems.length > 0 &&
    rawItems.every((item) => {
      const value = availableQtyMap[item._id];
      return value !== undefined && value !== null && value !== "";
    });
  const hasUnsavedStockChanges = rawItems.some(
    (item) => Number(availableQtyMap[item._id] ?? 0) !== Number(persistedQtyMap[item._id] ?? 0),
  );
  const allRestockItemsReady = rawItems
    .filter((item) => item.stockStatus === "To Be Ordered")
    .every((item) => Number(persistedQtyMap[item._id] ?? 0) >= Number(item.quantity || 0));
  const canEditStock =
    showWarehouseActions &&
    ["Parts Requested", "To Be Ordered"].includes(currentStatus);
  const stockAction = useMemo(() => {
    if (!showWarehouseActions) return null;
    if (currentStatus === "Parts Requested") {
      return {
        title: "Stock Review",
        label: "Submit Stock Review",
        disabled: !allQuantitiesFilled,
        onPress: "submitReview",
      };
    }
    if (currentStatus === "To Be Ordered") {
      if (hasUnsavedStockChanges) {
        return {
          title: "Save Stock",
          label: "Save Stock",
          disabled: !allQuantitiesFilled,
          onPress: "saveRestock",
        };
      }
      return {
        title: "Confirm Restock",
        label: "Mark as Restocked",
        disabled: !allRestockItemsReady,
        onPress: "markRestocked",
      };
    }
    if (currentStatus === "Approved") {
      return {
        title: "Delivery",
        label: "Mark Delivered",
        disabled: false,
        onPress: "markDelivered",
      };
    }
    if (currentStatus === "Availability Checked") {
      return {
        title: "Awaiting Maintenance Review",
        label: "Waiting",
        disabled: true,
        onPress: null,
      };
    }
    if (currentStatus === "Ordered") {
      return {
        title: "Awaiting Approval",
        label: "Waiting",
        disabled: true,
        onPress: null,
      };
    }
    return {
      title: "Completed",
      label: "Done",
      disabled: true,
      onPress: null,
    };
  }, [
    allQuantitiesFilled,
    allRestockItemsReady,
    currentStatus,
    hasUnsavedStockChanges,
    showWarehouseActions,
  ]);

  if (!request) return null;

  const buildUpdatedItems = () =>
    rawItems.map((item) => {
      const availableQty = Number(availableQtyMap[item._id] ?? item.availableQty ?? 0);
      return {
        ...item,
        availableQty,
        stockStatus: getItemStockStatus?.(item, availableQty) || item.stockStatus,
      };
    });

  const handleWarehouseAction = () => {
    if (!stockAction?.onPress) return;
    const updatedItems = buildUpdatedItems();

    if (stockAction.onPress === "submitReview") {
      onSubmitStockReview?.(request, updatedItems);
    } else if (stockAction.onPress === "saveRestock") {
      onSaveRestock?.(request, updatedItems);
      setPersistedQtyMap({ ...availableQtyMap });
    } else if (stockAction.onPress === "markRestocked") {
      onMarkRestocked?.(request, updatedItems);
    } else if (stockAction.onPress === "markDelivered") {
      onMarkDelivered?.(request);
    }
  };

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
            <AppText
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: COLORS.black,
              }}
            >
              Request Details
            </AppText>

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
              <AppText
                style={{
                  fontSize: 12,
                  color: COLORS.grayDark,
                  marginBottom: 8,
                }}
              >
                Overall Request Status:
              </AppText>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: overallStatusStyle.borderColor,
                  borderRadius: 20,
                  paddingHorizontal: 18,
                  paddingVertical: 6,
                }}
              >
                <AppText
                  style={{
                    color: overallStatusStyle.textColor,
                    fontSize: 12,
                    fontWeight: "500",
                  }}
                >
                  {getDisplayStatusLabel(request.overallStatus)}
                </AppText>
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
                  <AppText
                    style={{
                      fontSize: 12,
                      color: COLORS.grayDark,
                      marginBottom: 2,
                    }}
                  >
                    {label}
                  </AppText>
                  <AppText
                    style={{
                      fontSize: 12,
                      color: COLORS.black,
                      fontWeight: "700",
                    }}
                  >
                    {value}
                  </AppText>
                </View>
              ))}
            </View>

            <AppText
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: "#333333",
                marginBottom: 12,
              }}
            >
              Request Items
            </AppText>

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
                const rawItem = rawItems[index] || {};

                return (
                  <View
                    key={`${item.itemName}-${index}`}
                    style={{
                      marginBottom:
                        index < request.requestItems.length - 1 ? 16 : 0,
                    }}
                  >
                    <View style={{ marginBottom: 8 }}>
                      <AppText style={{ fontSize: 12, color: COLORS.grayDark }}>
                        Item Name
                      </AppText>
                      <AppText
                        style={{
                          fontSize: 12,
                          color: COLORS.black,
                          fontWeight: "700",
                        }}
                      >
                        {item.itemName}
                      </AppText>
                    </View>

                    <View style={{ marginBottom: 8 }}>
                      <AppText style={{ fontSize: 12, color: COLORS.grayDark }}>
                        Purpose
                      </AppText>
                      <AppText
                        style={{
                          fontSize: 12,
                          color: COLORS.black,
                          fontWeight: "700",
                        }}
                      >
                        {item.purpose}
                      </AppText>
                    </View>

                    <View style={{ marginBottom: 8 }}>
                      <AppText style={{ fontSize: 12, color: COLORS.grayDark }}>
                        Requested
                      </AppText>
                      <AppText
                        style={{
                          fontSize: 12,
                          color: COLORS.black,
                          fontWeight: "700",
                        }}
                      >
                        {item.requested}
                      </AppText>
                    </View>

                    <View style={{ marginBottom: 8 }}>
                      <AppText style={{ fontSize: 12, color: COLORS.grayDark }}>
                        Available Qty
                      </AppText>
                      {canEditStock ? (
                        <AppInput
                          keyboardType="numeric"
                          value={String(availableQtyMap[rawItem._id] ?? "")}
                          onChangeText={(value) =>
                            setAvailableQtyMap((current) => ({
                              ...current,
                              [rawItem._id]: value.replace(/[^0-9]/g, ""),
                            }))
                          }
                          placeholder="0"
                          placeholderTextColor={COLORS.grayDark}
                          style={{
                            borderWidth: 1,
                            borderColor: "#D8D8D8",
                            borderRadius: 6,
                            paddingHorizontal: 10,
                            paddingVertical: 8,
                            fontSize: 12,
                            color: COLORS.black,
                            marginTop: 4,
                          }}
                        />
                      ) : (
                        <AppText
                          style={{
                            fontSize: 12,
                            color: COLORS.black,
                            fontWeight: "700",
                          }}
                        >
                          {item.availableQty || rawItem.availableQty || "0"}
                        </AppText>
                      )}
                    </View>

                    <View>
                      <AppText
                        style={{
                          fontSize: 12,
                          color: COLORS.grayDark,
                          marginBottom: 5,
                        }}
                      >
                        Status
                      </AppText>
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
                      <AppText
                        style={{
                          color: badgeStyle.textColor,
                          fontSize: 12,
                        }}
                      >
                          {getDisplayStatusLabel(item.status)}
                        </AppText>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            <AppText
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: "#333333",
                marginBottom: 12,
              }}
            >
              Warehouse Flow
            </AppText>

            {request.timeline.map((entry, index) => {
              const badgeStyle = getTimelineBadgeStyle(entry.status);
              const iconName = entry.isCompleted
                ? "check-circle-outline"
                : entry.isCurrent
                  ? "clock-outline"
                  : "circle-outline";
              const iconColor = entry.isCompleted
                ? "#2E7D32"
                : entry.isCurrent
                  ? COLORS.primaryLight
                  : COLORS.grayMedium;
              const contentOpacity = entry.isCompleted || entry.isCurrent ? 1 : 0.55;

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
                    name={iconName}
                    size={24}
                    color={iconColor}
                    style={{ marginRight: 10, marginTop: 2 }}
                  />

                  <View style={{ flex: 1, opacity: contentOpacity }}>
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
                      <AppText
                        style={{
                          color: badgeStyle.textColor,
                          fontSize: 12,
                        }}
                      >
                        {getDisplayStatusLabel(entry.status)}
                      </AppText>
                    </View>

                    <AppText
                      style={{
                        fontSize: 12,
                        color: COLORS.grayDark,
                        marginBottom: 2,
                      }}
                    >
                      {entry.dateTime}
                    </AppText>
                    <AppText
                      style={{
                        fontSize: 12,
                        color: COLORS.black,
                        fontWeight: "700",
                        marginBottom: 2,
                      }}
                    >
                      {entry.by}
                    </AppText>
                    <AppText style={{ fontSize: 12, color: COLORS.grayDark }}>
                      {entry.description}
                    </AppText>
                  </View>
                </View>
              );
            })}

            {showWarehouseActions && stockAction && (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: "#E4E4E4",
                  borderRadius: 8,
                  padding: 12,
                  marginTop: 4,
                  marginBottom: 16,
                }}
              >
                <AppText
                  style={{
                    fontSize: 12,
                    color: COLORS.black,
                    fontWeight: "700",
                    marginBottom: 4,
                  }}
                >
                  {stockAction.title}
                </AppText>
                <AppText
                  style={{
                    fontSize: 12,
                    color: COLORS.grayDark,
                    marginBottom: 10,
                  }}
                >
                  {currentStatus === "Parts Requested" &&
                    "Enter available quantities for all requested items."}
                  {currentStatus === "To Be Ordered" &&
                    (hasUnsavedStockChanges
                      ? "Save the updated stock quantities first."
                      : "Confirm restocked items when all requested quantities are available.")}
                  {currentStatus === "Approved" &&
                    "Approved requisition is ready for warehouse delivery."}
                  {currentStatus === "Availability Checked" &&
                    "Stock review submitted. Waiting for maintenance review."}
                  {currentStatus === "Ordered" &&
                    "Restock confirmed. Waiting for maintenance approval."}
                  {["Delivered", "Cancelled"].includes(currentStatus) &&
                    "No further warehouse action is needed."}
                </AppText>
                <TouchableOpacity
                  activeOpacity={stockAction.disabled ? 1 : 0.8}
                  disabled={stockAction.disabled}
                  onPress={handleWarehouseAction}
                  style={{
                    alignSelf: "flex-end",
                    backgroundColor: stockAction.disabled
                      ? "#D8D8D8"
                      : COLORS.primaryLight,
                    paddingHorizontal: 18,
                    paddingVertical: 12,
                    borderRadius: 6,
                  }}
                >
                  <AppText
                    style={{
                      color: COLORS.white,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    {stockAction.label}
                  </AppText>
                </TouchableOpacity>
              </View>
            )}

            {showManagerActions && (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 8,
                }}
              >
                <TouchableOpacity
                  activeOpacity={canOrder ? 0.8 : 1}
                  onPress={() => onOrder?.(request)}
                  disabled={!canOrder}
                  style={{
                    backgroundColor: canOrder ? COLORS.white : "#F1F1F1",
                    borderWidth: 1,
                    borderColor: canOrder ? "#E6A246" : "#D8D8D8",
                    paddingHorizontal: 18,
                    paddingVertical: 12,
                    borderRadius: 6,
                  }}
                >
                  <AppText
                    style={{
                      color: canOrder ? "#C26A00" : "#9E9E9E",
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    {getDisplayStatusLabel(orderLabel)}
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={canApprove ? 0.8 : 1}
                  onPress={() => onApprove?.(request)}
                  disabled={!canApprove}
                  style={{
                    backgroundColor: canApprove ? COLORS.primaryLight : "#D8D8D8",
                    paddingHorizontal: 18,
                    paddingVertical: 12,
                    borderRadius: 6,
                  }}
                >
                  <AppText
                    style={{
                      color: COLORS.white,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    {approveLabel}
                  </AppText>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
