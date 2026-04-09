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
import { COLORS } from "../../stylesheets/colors";
import { AuthContext } from "../../Context/AuthContext";
import PartsRequisitionCards from "../../components/PartsRequisition/PartsRequisitionCards";
import PartsRequisitionEntry from "../../components/PartsRequisition/PartsRequisitionEntry";
import PartsRequisitionDetails from "../../components/PartsRequisition/PartsRequisitionDetails";
import { API_BASE } from "../../utilities/API_BASE";

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

const mapStatusForDisplay = (status) =>
  status === "In Progress" ? "Ready for Pickup" : status;

const buildTimeline = (record) => {
  const timeline = [
    {
      status: "Pending",
      dateTime: formatDateTime(record.dateRequested || record.createdAt),
      by: record.staff?.requisitioner || "-",
      description: `Request submitted with ${record.items?.length || 0} item(s)`,
    },
  ];

  if (
    ["Approved", "In Progress", "Completed"].includes(record.status) &&
    (record.dateApproved || record.updatedAt)
  ) {
    timeline.push({
      status: "Approved",
      dateTime: formatDateTime(record.dateApproved || record.updatedAt),
      by: record.staff?.approvedBy || "-",
      description: "Requisition approved",
    });
  }

  if (record.status === "In Progress") {
    timeline.push({
      status: "In Progress",
      dateTime: formatDateTime(record.updatedAt),
      by: record.staff?.receiver || "Warehouse Department",
      description: "Request is ready for pickup",
    });
  }

  if (record.status === "Completed") {
    timeline.push({
      status: "Completed",
      dateTime: formatDateTime(record.dateReceived || record.updatedAt),
      by: record.staff?.receiver || "-",
      description: "Items received and request completed",
    });
  }

  if (["Rejected", "Cancelled"].includes(record.status)) {
    timeline.push({
      status: record.status,
      dateTime: formatDateTime(record.updatedAt),
      by: record.staff?.approvedBy || "-",
      description:
        record.status === "Rejected"
          ? "Requisition was rejected"
          : "Requisition was cancelled",
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

  return {
    ...record,
    id: record._id,
    slipNo: record.wrsNo,
    status: mapStatusForDisplay(record.status),
    rawStatus: record.status,
    requestedBy: record.staff?.requisitioner || "-",
    aircraft: record.aircraft || "-",
    itemSummary: firstItem
      ? items.length === 1
        ? `${firstItem.particular} x ${firstItem.quantity} ${firstItem.unitOfMeasure || ""}`.trim()
        : `${firstItem.particular} +${items.length - 1} more`
      : "No items",
    purpose: firstItem?.purpose || "-",
    totalItems: items.length,
    totalQuantity: `${totalQuantity}`,
    dateRequested: formatDate(record.dateRequested || record.createdAt),
    requestDetails: {
      id: record._id,
      requestId: record.wrsNo,
      requestDate: formatDate(record.dateRequested || record.createdAt),
      requestedBy: record.staff?.requisitioner || "-",
      aircraft: record.aircraft || "-",
      totalItems: items.length,
      totalQuantity: `${totalQuantity}`,
      overallStatus: mapStatusForDisplay(record.status),
      rawStatus: record.status,
      requestItems: items.map((item) => ({
        itemName: item.particular || "-",
        purpose: item.purpose || "-",
        requested: `${item.quantity || 0} ${item.unitOfMeasure || ""}`.trim(),
        status: mapStatusForDisplay(record.status),
      })),
      notes: "",
      timeline: buildTimeline(record).map((entry) => ({
        ...entry,
        status: mapStatusForDisplay(entry.status),
      })),
    },
  };
};

export default function PartsRequisition() {
  const { user } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("Active");
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requisitions, setRequisitions] = useState([]);
  const [aircraftOptions, setAircraftOptions] = useState([]);
  const [selectedAircraft, setSelectedAircraft] = useState("");
  const [loading, setLoading] = useState(false);

  const userRole = user?.jobTitle?.toLowerCase() || "engineer";
  const isReviewer = ["maintenance manager", "officer-in-charge"].includes(
    userRole,
  );
  const tabLabels = isReviewer ? ["Pending", "Review"] : ["Active", "History"];

  useEffect(() => {
    setSelectedTab(isReviewer ? "Pending" : "Active");
  }, [isReviewer]);

  const parseJsonSafely = async (response) => {
    const text = await response.text();

    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      console.error("Failed to parse JSON response:", text);
      throw new Error("Server returned an invalid response");
    }
  };

  const fetchRequisitions = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("currentUserToken");
      const response = await fetch(
        `${API_BASE}/api/parts-requisition/get-all-requisition`,
        {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : undefined,
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch requisitions (${response.status} ${response.statusText})`,
        );
      }

      const data = await parseJsonSafely(response);
      setRequisitions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching requisitions:", error);
      Alert.alert("Error", "Failed to fetch parts requisitions.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAircraftOptions = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/parts-monitoring/aircraft-list`);

      if (!response.ok) {
        throw new Error("Failed to fetch aircraft options");
      }

      const data = await response.json();
      setAircraftOptions(
        (data.data || []).map((aircraft) => ({
          id: aircraft,
          name: aircraft,
        })),
      );
    } catch (error) {
      console.error("Error fetching aircraft options:", error);
      setAircraftOptions([]);
    }
  }, []);

  useEffect(() => {
    fetchRequisitions();
    fetchAircraftOptions();
  }, [fetchAircraftOptions, fetchRequisitions]);

  const mappedRequisitions = useMemo(
    () => requisitions.map(mapRequisitionToCard),
    [requisitions],
  );

  const filteredRequisitions = useMemo(() => {
    const sourceData = mappedRequisitions.filter((item) => {
      if (isReviewer) {
        return selectedTab === "Pending"
          ? item.rawStatus === "Pending"
          : item.rawStatus === "Approved";
      }

      return selectedTab === "Active"
        ? item.rawStatus === "Pending"
        : item.rawStatus !== "Pending";
    });

    return sourceData.filter((item) => {
      const matchesSearch =
        searchQuery.trim().length === 0 ||
        item.slipNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.requestedBy?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.itemSummary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.aircraft.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [
    isReviewer,
    mappedRequisitions,
    searchQuery,
    selectedTab,
  ]);

  const handleNewEntry = () => {
    setShowNewEntryModal(true);
  };

  const handleViewDetails = (item) => {
    setSelectedRequest(item.requestDetails);
    setShowDetailsModal(true);
  };

  const handleEdit = (item) => {
    Alert.alert(
      "Not Yet Available",
      "Editing requisitions is not connected yet because the current backend only supports create and status updates.",
    );
  };

  const handleDelete = (item) => {
    Alert.alert(
      "Not Yet Available",
      "Deleting requisitions is not connected yet because the current backend does not have a delete route.",
    );
  };

  const handleSubmitNewEntry = async ({ aircraft, items }) => {
    if (!aircraft) {
      Alert.alert("Validation Error", "Please choose an aircraft.");
      return;
    }

    if (!items?.length) {
      Alert.alert("Validation Error", "Please add at least one item.");
      return;
    }

    if (
      items.some(
        (item) =>
          !item.materialCodeNumber.trim() ||
          !item.particular.trim() ||
          !item.quantity ||
          Number(item.quantity) <= 0,
      )
    ) {
      Alert.alert(
        "Validation Error",
        "Material code number, particular, and quantity are required for each item.",
      );
      return;
    }

    const highestSlipNumber = mappedRequisitions.reduce((highest, item) => {
      const numericPart = Number(item.slipNo?.replace("WRS-", "")) || 0;
      return numericPart > highest ? numericPart : highest;
    }, 0);

    const nextSlipNumber = highestSlipNumber + 1;
    const nextSlipNo = `WRS-${String(nextSlipNumber).padStart(3, "0")}`;

    const fullName =
      `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Unknown User";

    const payload = {
      wrsNo: nextSlipNo,
      aircraft,
      staff: {
        requisitioner: fullName,
        approvedBy: "",
        receiver: "",
        notedBy: "",
      },
      items: items.map((item, index) => ({
        itemNo: index + 1,
        matCodeNo: item.materialCodeNumber.trim(),
        particular: item.particular.trim(),
        quantity: Number(item.quantity),
        unitOfMeasure: item.unit,
        purpose: item.purpose.trim(),
      })),
      dateRequested: new Date().toISOString(),
      status: "Pending",
    };

    try {
      const token = await AsyncStorage.getItem("currentUserToken");
      const response = await fetch(
        `${API_BASE}/api/parts-requisition/create-requisition`,
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
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errorData = await parseJsonSafely(response);
        throw new Error(errorData?.message || "Failed to create requisition");
      }

      setSelectedAircraft("");
      setShowNewEntryModal(false);
      setSelectedTab("Active");
      await fetchRequisitions();
      Alert.alert("Submit Entry", `${nextSlipNo} added successfully.`);
    } catch (error) {
      console.error("Error creating requisition:", error);
      Alert.alert("Error", error.message || "Failed to create requisition.");
    }
  };

  const updateRequestStatus = async (request, nextStatus) => {
    try {
      const token = await AsyncStorage.getItem("currentUserToken");
      const fullName =
        `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Unknown User";
      const payload = { status: nextStatus };

      if (nextStatus === "Approved") {
        payload.dateApproved = new Date().toISOString();
        payload.approvedBy = fullName;
      }

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
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errorData = await parseJsonSafely(response);
        throw new Error(errorData?.message || "Failed to update requisition");
      }

      setShowDetailsModal(false);
      await fetchRequisitions();

      if (nextStatus === "Approved") {
        setSelectedTab("Review");
      }

      Alert.alert("Success", `${request.requestId} marked as ${nextStatus}.`);
    } catch (error) {
      console.error("Error updating requisition:", error);
      Alert.alert("Error", error.message || "Failed to update requisition.");
    }
  };

  const handleApproveRequest = (request) => {
    updateRequestStatus(request, "Approved");
  };

  const handleRejectRequest = (request) => {
    updateRequestStatus(request, "Rejected");
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
    <View style={{ flex: 1, backgroundColor: COLORS.grayLight, paddingTop: 10 }}>
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
            loading={loading}
          />
        </ScrollView>
      </View>

      {!isReviewer && (
        <PartsRequisitionEntry
          visible={showNewEntryModal}
          onClose={() => setShowNewEntryModal(false)}
          onSubmit={handleSubmitNewEntry}
          selectedAircraft={selectedAircraft}
          onChangeAircraft={setSelectedAircraft}
          aircraftOptions={aircraftOptions}
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
