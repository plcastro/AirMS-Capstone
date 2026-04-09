import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../stylesheets/colors";
import { AuthContext } from "../../Context/AuthContext";
import PartsRequisitionCards from "../../components/PartsRequisition/PartsRequisitionCards";
import PartsRequisitionEntry from "../../components/PartsRequisition/PartsRequisitionEntry";
import PartsRequisitionDetails from "../../components/PartsRequisition/PartsRequisitionDetails";

const SAMPLE_ACTIVE_REQUISITIONS = [
  {
    id: "wrs-001",
    slipNo: "WRS-001",
    itemSummary: "HEX BOLT x 2 pcs",
    dateRequested: "02/02/2026",
    purpose: "RP-C7726",
    status: "Pending",
  },
];

const SAMPLE_HISTORY_REQUISITIONS = [
  {
    id: "wrs-002",
    slipNo: "WRS-002",
    itemSummary: "LOCK WASHER x 8 pcs",
    dateRequested: "01/28/2026",
    purpose: "WO-1194",
    status: "Approved",
  },
  {
    id: "wrs-003",
    slipNo: "WRS-003",
    itemSummary: "SEALANT x 1 L",
    dateRequested: "01/25/2026",
    purpose: "WO-1191",
    status: "Ready for Pickup",
  },
  {
    id: "wrs-004",
    slipNo: "WRS-004",
    itemSummary: "RIVETS x 25 pcs",
    dateRequested: "01/20/2026",
    purpose: "WO-1187",
    status: "Completed",
  },
];

const SAMPLE_REVIEWER_PENDING_REQUISITIONS = [
  {
    id: "wrs-011",
    slipNo: "WRS-011",
    itemSummary: "HEX BOLT x 2 pcs",
    dateRequested: "02/02/2026",
    purpose: "RP-C7726",
    status: "Pending",
    requestedBy: "John Doe",
  },
  {
    id: "wrs-012",
    slipNo: "WRS-012",
    itemSummary: "SEALANT x 1 L",
    dateRequested: "02/03/2026",
    purpose: "RP-C7730",
    status: "Pending",
    requestedBy: "Mark Santos",
  },
];

const SAMPLE_REVIEWER_APPROVED_REQUISITIONS = [
  {
    id: "wrs-013",
    slipNo: "WRS-013",
    itemSummary: "RIVETS x 25 pcs",
    dateRequested: "02/01/2026",
    purpose: "WO-1194",
    status: "Approved",
    requestedBy: "John Doe",
  },
  {
    id: "wrs-014",
    slipNo: "WRS-014",
    itemSummary: "LOCK WASHER x 8 pcs",
    dateRequested: "01/31/2026",
    purpose: "WO-1191",
    status: "Approved",
    requestedBy: "Carlo Reyes",
  },
];

export default function PartsRequisition() {
  const { user } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("Active");
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [activeRequisitions, setActiveRequisitions] = useState(
    SAMPLE_ACTIVE_REQUISITIONS,
  );
  const [reviewerPendingRequisitions, setReviewerPendingRequisitions] = useState(
    SAMPLE_REVIEWER_PENDING_REQUISITIONS,
  );
  const [reviewerApprovedRequisitions, setReviewerApprovedRequisitions] = useState(
    SAMPLE_REVIEWER_APPROVED_REQUISITIONS,
  );

  const userRole = user?.jobTitle?.toLowerCase() || "engineer";
  const isReviewer = ["maintenance manager", "officer-in-charge"].includes(
    userRole,
  );
  const tabLabels = isReviewer ? ["Pending", "Review"] : ["Active", "History"];

  useEffect(() => {
    setSelectedTab(isReviewer ? "Pending" : "Active");
  }, [isReviewer]);

  const filteredRequisitions = useMemo(() => {
    const sourceData = isReviewer
      ? selectedTab === "Pending"
        ? reviewerPendingRequisitions
        : reviewerApprovedRequisitions
      : selectedTab === "Active"
        ? activeRequisitions
        : SAMPLE_HISTORY_REQUISITIONS;

    return sourceData.filter((item) => {
      const matchesSearch =
        searchQuery.trim().length === 0 ||
        item.slipNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.itemSummary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.purpose.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [
    activeRequisitions,
    isReviewer,
    reviewerApprovedRequisitions,
    reviewerPendingRequisitions,
    searchQuery,
    selectedTab,
  ]);

  const handleNewEntry = () => {
    setShowNewEntryModal(true);
  };

  const handleViewDetails = (item) => {
    setSelectedRequest({
      requestId: item.slipNo,
      requestDate: "February 2, 2026",
      requestedBy: item.requestedBy || "John Doe",
      totalItems: item.totalItems || 1,
      totalQuantity:
        item.totalQuantity ||
        item.itemSummary.split(" x ")[1] ||
        "0 pcs",
      overallStatus: item.status,
      requestItems: [
        ...(item.items?.map((entry) => ({
          itemName: entry.particular || "-",
          purpose: entry.purpose || "-",
          requested: `${entry.quantity || 0} ${entry.unit || "pcs"}`,
          status: item.status,
        })) || [
          {
            itemName: item.itemSummary.split(" x ")[0],
            purpose: item.purpose,
            requested: item.itemSummary.split(" x ")[1] || "2 pcs",
            status: item.status,
          },
        ]),
      ],
      notes: "",
      timeline:
        item.status === "Completed"
          ? [
              {
                status: "Pending",
                dateTime: "February 2, 2026 at 09:15 AM",
                by: "John Doe",
                description: "Request submitted with 1 item",
              },
              {
                status: "Approved",
                dateTime: "February 2, 2026 at 09:45 AM",
                by: "Ramsay Gordon (Maintenance Manager)",
                description: "Approved",
              },
              {
                status: "Ready for Pickup",
                dateTime: "February 2, 2026 at 10:15 AM",
                by: "Warehouse Staff",
                description: "Request prepared for pickup",
              },
              {
                status: "Completed",
                dateTime: "February 2, 2026 at 11:00 AM",
                by: "John Doe",
                description: "Items received and request completed",
              },
            ]
          : item.status === "Ready for Pickup"
            ? [
                {
                  status: "Pending",
                  dateTime: "February 2, 2026 at 09:15 AM",
                  by: "John Doe",
                  description: "Request submitted with 1 item",
                },
                {
                  status: "Approved",
                  dateTime: "February 2, 2026 at 09:45 AM",
                  by: "Ramsay Gordon (Maintenance Manager)",
                  description: "Approved",
                },
                {
                  status: "Ready for Pickup",
                  dateTime: "February 2, 2026 at 10:15 AM",
                  by: "Warehouse Staff",
                  description: "Request prepared for pickup",
                },
              ]
          : item.status === "Approved"
          ? [
              {
                status: "Pending",
                dateTime: "February 2, 2026 at 09:15 AM",
                by: "John Doe",
                description: "Request submitted with 1 item",
              },
              {
                status: "Approved",
                dateTime: "February 2, 2026 at 09:45 AM",
                by: "Ramsay Gordon (Maintenance Manager)",
                description: "Approved",
              },
            ]
          : [
              {
                status: "Pending",
                dateTime: "February 2, 2026 at 09:15 AM",
                by: "John Doe",
                description: "Request submitted with 1 item",
              },
            ],
    });
    setShowDetailsModal(true);
  };

  const handleEdit = (item) => {
    Alert.alert("Edit Request", `Edit ${item.slipNo}.`);
  };

  const handleDelete = (item) => {
    Alert.alert("Delete Request", `Delete ${item.slipNo}.`);
  };

  const handleSubmitNewEntry = (items) => {
    const highestSlipNumber = activeRequisitions.reduce((highest, item) => {
      const numericPart = Number(item.slipNo?.replace("WRS-", "")) || 0;
      return numericPart > highest ? numericPart : highest;
    }, 0);

    const nextSlipNumber = highestSlipNumber + 1;
    const nextSlipNo = `WRS-${String(nextSlipNumber).padStart(3, "0")}`;

    const totalQuantity = items.reduce((sum, item) => {
      const parsedQuantity = Number(item.quantity) || 0;
      return sum + parsedQuantity;
    }, 0);

    const firstItem = items[0];
    const itemSummary =
      items.length === 1
        ? `${firstItem.particular || "Unnamed Item"} x ${firstItem.quantity || 0} ${firstItem.unit}`
        : `${firstItem.particular || "Unnamed Item"} +${items.length - 1} more`;

    const newRequest = {
      id: nextSlipNo.toLowerCase(),
      slipNo: nextSlipNo,
      itemSummary,
      dateRequested: new Date().toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      }),
      purpose: firstItem.purpose || "-",
      status: "Pending",
      items,
      totalItems: items.length,
      totalQuantity:
        totalQuantity > 0
          ? `${totalQuantity} ${firstItem.unit || "pcs"}`
          : `0 ${firstItem.unit || "pcs"}`,
    };

    setActiveRequisitions((prev) => [newRequest, ...prev]);
    setSelectedTab("Active");
    setShowNewEntryModal(false);
    Alert.alert("Submit Entry", `${nextSlipNo} added successfully.`);
  };

  const handleApproveRequest = (request) => {
    setReviewerPendingRequisitions((prev) =>
      prev.filter((item) => item.slipNo !== request.requestId),
    );

    setReviewerApprovedRequisitions((prev) => [
      {
        id: request.requestId.toLowerCase(),
        slipNo: request.requestId,
        itemSummary:
          request.requestItems.length === 1
            ? `${request.requestItems[0].itemName} x ${request.requestItems[0].requested}`
            : `${request.requestItems[0].itemName} +${request.requestItems.length - 1} more`,
        dateRequested: "02/02/2026",
        purpose: request.requestItems[0]?.purpose || "-",
        status: "Approved",
        requestedBy: request.requestedBy,
        totalItems: request.totalItems,
        totalQuantity: request.totalQuantity,
        items: request.requestItems.map((item) => ({
          particular: item.itemName,
          purpose: item.purpose,
          quantity: item.requested.split(" ")[0],
          unit: item.requested.split(" ").slice(1).join(" ") || "pcs",
        })),
      },
      ...prev,
    ]);

    setShowDetailsModal(false);
    setSelectedTab("Review");
    Alert.alert("Approved", `${request.requestId} moved to Review.`);
  };

  const handleRejectRequest = (request) => {
    setReviewerPendingRequisitions((prev) =>
      prev.filter((item) => item.slipNo !== request.requestId),
    );
    setShowDetailsModal(false);
    Alert.alert("Rejected", `${request.requestId} was rejected.`);
  };

  const renderTabButton = (label) => {
    const isSelected = selectedTab === label;

    return (
      <TouchableOpacity
        key={label}
        activeOpacity={0.8}
        onPress={() => setSelectedTab(label)}
        style={[
          {
            minWidth: 92,
            paddingHorizontal: 18,
            paddingVertical: 10,
            borderRadius: 20,
            backgroundColor: COLORS.white,
            borderWidth: 1,
            borderColor: COLORS.grayMedium,
          },
          isSelected && {
            backgroundColor: COLORS.primaryLight,
            borderColor: COLORS.primaryLight,
          },
        ]}
      >
        <Text
          style={[
            {
              textAlign: "center",
              color: "#6A6A6A",
              fontSize: 15,
              fontWeight: "500",
            },
            isSelected && { color: COLORS.white },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.grayLight }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.grayLight} />

      <View style={{ flex: 1, paddingHorizontal: 7 }}>
        <View style={{ flexDirection: "row", marginBottom: 14, gap: 12 }}>
          <View
            style={{
              flex: 1,
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
              placeholder="Search by mechanic"
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

          {!isReviewer && (
            <TouchableOpacity
              style={{
                backgroundColor: COLORS.primaryLight,
                borderRadius: 10,
                height: 48,
                paddingHorizontal: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              }}
              activeOpacity={0.8}
              onPress={handleNewEntry}
            >
              <MaterialCommunityIcons
                name="plus"
                size={20}
                color={COLORS.white}
              />
              <Text
                style={{
                  color: COLORS.white,
                  fontSize: 15,
                  fontWeight: "600",
                  marginLeft: 6,
                }}
              >
                New Entry
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
          {tabLabels.map(renderTabButton)}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          <PartsRequisitionCards
            requisitions={filteredRequisitions}
            onViewDetails={handleViewDetails}
            onEdit={handleEdit}
            onDelete={handleDelete}
            hideActions={isReviewer || selectedTab === "History"}
          />
        </ScrollView>
      </View>

      {!isReviewer && (
        <PartsRequisitionEntry
          visible={showNewEntryModal}
          onClose={() => setShowNewEntryModal(false)}
          onSubmit={handleSubmitNewEntry}
        />
      )}

      <PartsRequisitionDetails
        visible={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        request={selectedRequest}
        showReviewActions={isReviewer && selectedTab === "Pending"}
        onApprove={handleApproveRequest}
        onReject={handleRejectRequest}
      />
    </View>
  );
}
