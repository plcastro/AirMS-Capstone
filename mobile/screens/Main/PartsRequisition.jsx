import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AuthContext } from "../../Context/AuthContext";
import { COLORS } from "../../stylesheets/colors";
import PartsRequisitionCards from "../../components/PartsRequisition/PartsRequisitionCards";
import PartsRequisitionDetails from "../../components/PartsRequisition/PartsRequisitionDetails";
import { API_BASE } from "../../utilities/API_BASE";

const parseRequestedDate = (dateValue) => {
  const parsedDate = new Date(dateValue);
  return Number.isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime();
};

const formatDate = (dateValue) => {
  const parsedDate = new Date(dateValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return dateValue || "-";
  }

  return parsedDate.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
};

const formatDateTime = (dateValue) => {
  const parsedDate = new Date(dateValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return parsedDate.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const buildTimeline = (record) => {
  const currentStatus =
    record.status === "Cancelled" ? "Rejected" : record.status;
  const timeline = [
    {
      status: "Pending",
      dateTime: formatDateTime(record.dateRequested || record.createdAt),
      by: record.staff?.requisitioner || record.staff?.employeeName || "-",
      description: `Request submitted with ${record.items?.length || 0} item(s)`,
    },
  ];

  if (
    ["Approved", "In Progress", "Completed"].includes(currentStatus) &&
    (record.dateApproved || record.updatedAt)
  ) {
    timeline.push({
      status: "Approved",
      dateTime: formatDateTime(record.dateApproved || record.updatedAt),
      by: record.staff?.approvedBy || "-",
      description: "Requisition approved",
    });
  }

  if (currentStatus === "In Progress") {
    timeline.push({
      status: "In Progress",
      dateTime: formatDateTime(record.updatedAt),
      by: "Warehouse Department",
      description: "Request is being prepared by warehouse",
    });
  }

  if (currentStatus === "Completed") {
    timeline.push({
      status: "Completed",
      dateTime: formatDateTime(record.dateReceived || record.updatedAt),
      by: record.staff?.receiver || "-",
      description: "Items were released and received",
    });
  }

  if (currentStatus === "Rejected") {
    timeline.push({
      status: currentStatus,
      dateTime: formatDateTime(record.updatedAt),
      by: record.staff?.approvedBy || "-",
      description: "Requisition was rejected",
    });
  }

  return timeline;
};

const mapRequisitionToCard = (record) => {
  const items = Array.isArray(record.items) ? record.items : [];
  const totalQuantity = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0),
    0,
  );
  const firstItem = items[0];
  const normalizedStatus =
    record.status === "Cancelled" ? "Rejected" : record.status;

  return {
    ...record,
    id: record._id,
    status: normalizedStatus,
    slipNo: record.wrsNo,
    requestedBy:
      record.staff?.requisitioner || record.staff?.employeeName || "-",
    itemSummary: firstItem
      ? items.length === 1
        ? `${firstItem.particular} x ${firstItem.quantity} ${firstItem.unitOfMeasure || ""}`.trim()
        : `${firstItem.particular} +${items.length - 1} more`
      : "No items",
    totalItems: items.length,
    totalQuantity,
    totalQuantityLabel: `${totalQuantity}`,
    formattedDateRequested: formatDate(record.dateRequested || record.createdAt),
    requestDetails: {
      id: record._id,
      requestId: record.wrsNo,
      requestDate: formatDate(record.dateRequested || record.createdAt),
      requestedBy:
        record.staff?.requisitioner || record.staff?.employeeName || "-",
      aircraft: record.aircraft || "-",
      totalItems: items.length,
      totalQuantity: `${totalQuantity}`,
      overallStatus: normalizedStatus,
      requestItems: items.map((item) => ({
        itemName: item.particular || "-",
        materialCodeNumber: item.matCodeNo || "-",
        purpose: item.purpose || "-",
        requested: `${item.quantity || 0} ${item.unitOfMeasure || ""}`.trim(),
        status: normalizedStatus,
      })),
      notes: "",
      timeline: buildTimeline(record),
    },
  };
};

export default function PartsRequisition() {
  const { user } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [dateSortOrder, setDateSortOrder] = useState("newest");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(false);

  const userRole = user?.jobTitle?.toLowerCase() || "";
  const isWarehouseDepartment = userRole === "warehouse department";
  const isReviewer = ["maintenance manager", "officer-in-charge"].includes(
    userRole,
  );

  const fetchRequisitions = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("currentUserToken");
      const response = await fetch(
        `${API_BASE}/api/parts-requisition/get/all-requisition`,
        {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : undefined,
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch requisitions");
      }

      const data = await response.json();
      setRequisitions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching requisitions:", error);
      Alert.alert("Error", "Failed to fetch parts requisitions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequisitions();
  }, [fetchRequisitions]);

  const allRequisitionsWithCounts = useMemo(
    () => requisitions.map(mapRequisitionToCard),
    [requisitions],
  );

  const visibleRequisitions = useMemo(() => {
    if (isWarehouseDepartment) {
      return allRequisitionsWithCounts.filter((item) =>
        ["Approved", "In Progress", "Completed"].includes(item.status),
      );
    }

    return allRequisitionsWithCounts;
  }, [allRequisitionsWithCounts, isWarehouseDepartment]);

  const stats = useMemo(
    () => ({
      total: visibleRequisitions.length,
      pending: visibleRequisitions.filter((r) => r.status === "Pending").length,
      approved: visibleRequisitions.filter((r) => r.status === "Approved").length,
      inProgress: visibleRequisitions.filter((r) => r.status === "In Progress")
        .length,
      completed: visibleRequisitions.filter((r) => r.status === "Completed")
        .length,
      rejected: visibleRequisitions.filter((r) =>
        ["Rejected", "Cancelled"].includes(r.status),
      )
        .length,
    }),
    [visibleRequisitions],
  );

  const filteredRequisitions = useMemo(() => {
    let data = visibleRequisitions;

    if (searchQuery.trim()) {
      const normalizedQuery = searchQuery.trim().toLowerCase();
      data = data.filter(
        (item) =>
          item.wrsNo?.toLowerCase().includes(normalizedQuery) ||
          item.aircraft?.toLowerCase().includes(normalizedQuery) ||
          item.status?.toLowerCase().includes(normalizedQuery) ||
          item.requestedBy?.toLowerCase().includes(normalizedQuery),
      );
    }

    if (selectedStatus !== "all") {
      data = data.filter((item) => item.status === selectedStatus);
    }

    return [...data].sort((firstItem, secondItem) => {
      const firstDate = parseRequestedDate(
        firstItem.dateRequested || firstItem.createdAt,
      );
      const secondDate = parseRequestedDate(
        secondItem.dateRequested || secondItem.createdAt,
      );

      return dateSortOrder === "oldest"
        ? firstDate - secondDate
        : secondDate - firstDate;
    });
  }, [dateSortOrder, searchQuery, selectedStatus, visibleRequisitions]);

  const statusCards = useMemo(() => {
    const baseCards = [
      {
        title: "Total",
        value: stats.total,
        icon: "inbox-outline",
        statusKey: "all",
        backgroundColor: "#F5F5F5",
        textColor: "#555555",
      },
      {
        title: "Pending",
        value: stats.pending,
        icon: "clock-outline",
        statusKey: "Pending",
        backgroundColor: "#E3F2FD",
        textColor: "#1565C0",
      },
      {
        title: "Approved",
        value: stats.approved,
        icon: "check-circle-outline",
        statusKey: "Approved",
        backgroundColor: "#E0F7FA",
        textColor: "#00838F",
      },
      {
        title: "In Progress",
        value: stats.inProgress,
        icon: "progress-clock",
        statusKey: "In Progress",
        backgroundColor: "#FFF3E0",
        textColor: "#EF6C00",
      },
      {
        title: "Completed",
        value: stats.completed,
        icon: "file-check-outline",
        statusKey: "Completed",
        backgroundColor: "#E8F5E9",
        textColor: "#2E7D32",
      },
      {
        title: "Rejected",
        value: stats.rejected,
        icon: "close-circle-outline",
        statusKey: "Rejected",
        backgroundColor: "#FDECEC",
        textColor: "#C62828",
      },
    ];

    if (isWarehouseDepartment) {
      return baseCards.filter((card) =>
        ["all", "Approved", "In Progress", "Completed"].includes(card.statusKey),
      );
    }

    return baseCards;
  }, [isWarehouseDepartment, stats]);

  const handleViewDetails = (item) => {
    setSelectedRequest(item.requestDetails);
    setShowDetailsModal(true);
  };

  const updateRequestStatus = async (request, nextStatus) => {
    try {
      const token = await AsyncStorage.getItem("currentUserToken");
      const response = await fetch(
        `${API_BASE}/api/parts-requisition/update-requisition/${request.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {}),
          },
          body: JSON.stringify({ status: nextStatus }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to update requisition to ${nextStatus}`);
      }

      await fetchRequisitions();
      setShowDetailsModal(false);
      Alert.alert("Success", `${request.requestId} marked as ${nextStatus}.`);
    } catch (error) {
      console.error("Error updating requisition status:", error);
      Alert.alert("Error", "Failed to update requisition status.");
    }
  };

  const handleApproveRequest = (request) => {
    updateRequestStatus(request, "Approved");
  };

  const handleRejectRequest = (request) => {
    updateRequestStatus(request, "Rejected");
  };

  const renderStatusCard = (card) => {
    const isSelected = selectedStatus === card.statusKey;

    return (
      <TouchableOpacity
        key={card.statusKey}
        activeOpacity={0.85}
        onPress={() => setSelectedStatus(card.statusKey)}
        style={{
          width: 142,
          borderRadius: 16,
          paddingHorizontal: 14,
          paddingVertical: 14,
          marginRight: 10,
          backgroundColor: COLORS.white,
          borderWidth: 2,
          borderColor: isSelected ? card.textColor : "#ECECEC",
        }}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: card.backgroundColor,
            marginBottom: 12,
          }}
        >
          <MaterialCommunityIcons
            name={card.icon}
            size={20}
            color={card.textColor}
          />
        </View>

        <Text
          style={{
            fontSize: 22,
            fontWeight: "700",
            color: COLORS.black,
          }}
        >
          {card.value}
        </Text>
        <Text
          style={{
            fontSize: 14,
            marginTop: 4,
            color: COLORS.grayDark,
          }}
        >
          {card.title}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.grayLight }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.grayLight} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 7, paddingBottom: 24 }}
      >
        <View style={{ marginTop: 8, marginBottom: 14, gap: 12 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: COLORS.white,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: COLORS.grayMedium,
              height: 48,
              paddingHorizontal: 12,
            }}
          >
            <MaterialCommunityIcons
              name="magnify"
              size={22}
              color={COLORS.grayDark}
            />
            <TextInput
              placeholder="Search by WRS no., aircraft, status, or requester"
              placeholderTextColor={COLORS.grayDark}
              style={{
                flex: 1,
                marginLeft: 10,
                fontSize: 15,
                color: COLORS.black,
                padding: 0,
              }}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            {[
              { key: "newest", label: "Date: Newest First" },
              { key: "oldest", label: "Date: Oldest First" },
            ].map((option) => {
              const isSelected = dateSortOrder === option.key;

              return (
                <TouchableOpacity
                  key={option.key}
                  activeOpacity={0.8}
                  onPress={() => setDateSortOrder(option.key)}
                  style={{
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    backgroundColor: isSelected
                      ? COLORS.primaryLight
                      : COLORS.white,
                    borderWidth: 1,
                    borderColor: isSelected
                      ? COLORS.primaryLight
                      : COLORS.grayMedium,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: isSelected ? COLORS.white : COLORS.grayDark,
                      fontWeight: "500",
                    }}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={fetchRequisitions}
              style={{
                marginLeft: "auto",
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: COLORS.white,
                borderWidth: 1,
                borderColor: COLORS.grayMedium,
              }}
            >
              <MaterialCommunityIcons
                name="refresh"
                size={20}
                color={COLORS.primaryLight}
              />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 4, paddingRight: 6 }}
        >
          {statusCards.map(renderStatusCard)}
        </ScrollView>

        <View style={{ marginTop: 18 }}>
          <PartsRequisitionCards
            requisitions={filteredRequisitions}
            onViewDetails={handleViewDetails}
            hideActions
            loading={loading}
          />
        </View>
      </ScrollView>

      <PartsRequisitionDetails
        visible={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        request={selectedRequest}
        showReviewActions={
          isReviewer && selectedRequest?.overallStatus === "Pending"
        }
        onApprove={handleApproveRequest}
        onReject={handleRejectRequest}
      />
    </View>
  );
}
