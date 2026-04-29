import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../stylesheets/colors";
import { AuthContext } from "../../Context/AuthContext";
import { NotificationContext } from "../../Context/NotificationContext";
import PartsRequisitionCards from "../../components/PartsRequisition/PartsRequisitionCards";
import PartsRequisitionEntry from "../../components/PartsRequisition/PartsRequisitionEntry";
import PartsRequisitionDetails from "../../components/PartsRequisition/PartsRequisitionDetails";
import { API_BASE } from "../../utilities/API_BASE";
import { showToast } from "../../utilities/toast";
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

const normalizeOverallStatus = (status) => {
  switch (status) {
    case "Pending":
      return "Parts Requested";
    case "Completed":
      return "Delivered";
    case "Rejected":
      return "Cancelled";
    case "In Progress":
      return "Ordered";
    default:
      return status || "Parts Requested";
  }
};

const normalizeItemStatus = (status) => {
  switch (status) {
    case "Ready for Pickup":
      return "Ordered";
    default:
      return status || "Parts Requested";
  }
};

const hasWarehouseAssessment = (record) =>
  Boolean(record.dateWarehouseReviewed) ||
  (record.items || []).some(
    (item) => normalizeItemStatus(item.stockStatus) !== "Parts Requested",
  );

const hasRestockFlow = (record, overallStatus) => {
  const assessed = hasWarehouseAssessment(record);

  return (
    Boolean(record.dateOrdered) ||
    ["To Be Ordered", "Ordered"].includes(overallStatus) ||
    (assessed &&
      (record.items || []).some((item) => {
        const status = normalizeItemStatus(item.stockStatus);

        return (
          status === "Out of Stock" ||
          status === "To Be Ordered" ||
          status === "Ordered" ||
          Number(item.availableQty || 0) < Number(item.quantity || 0)
        );
      }))
  );
};

const isItemAvailableForApproval = (status) =>
  ["In Stock", "Ordered", "Approved", "Delivered"].includes(
    normalizeItemStatus(status),
  );

const getItemParticular = (item = {}) =>
  item.particular ||
  item.codeParticular?.[0]?.particular ||
  item.itemName ||
  "";

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

const buildTimeline = (record) => {
  const overallStatus = normalizeOverallStatus(record.status);
  const currentStatus =
    overallStatus === "Parts Requested" && hasWarehouseAssessment(record)
      ? "Availability Checked"
      : overallStatus;
  const statusSteps = ["Parts Requested", "Availability Checked"];

  if (hasRestockFlow(record, overallStatus)) {
    statusSteps.push("To Be Ordered", "Ordered");
  }

  statusSteps.push("Approved", "Delivered");

  const currentStepIndex = Math.max(statusSteps.indexOf(currentStatus), 0);
  const stepDetails = {
    "Parts Requested": {
      status: "Parts Requested",
      dateTime: formatDateTime(record.dateRequested || record.createdAt),
      by: record.staff?.requisitioner || "-",
      description: `Request submitted with ${record.items?.length || 0} item(s)`,
    },
    "Availability Checked": {
      status: "Availability Checked",
      dateTime: formatDateTime(
        record.dateWarehouseReviewed || record.updatedAt,
      ),
      by: record.staff?.warehouseBy || "Warehouse Department",
      description: "Warehouse reviewed item stock availability",
    },
    "To Be Ordered": {
      status: "To Be Ordered",
      dateTime: formatDateTime(record.dateOrdered || record.updatedAt),
      by: record.staff?.approvedBy || "Maintenance Manager",
      description: "Unavailable items were marked to be restocked",
    },
    Ordered: {
      status: "Ordered",
      dateTime: formatDateTime(record.updatedAt),
      by: record.staff?.warehouseBy || "Warehouse Department",
      description: "Warehouse confirmed the restocked items are available",
    },
    Approved: {
      status: "Approved",
      dateTime: formatDateTime(record.dateApproved || record.updatedAt),
      by: record.staff?.approvedBy || "-",
      description: "Requisition approved by maintenance manager",
    },
    Delivered: {
      status: "Delivered",
      dateTime: formatDateTime(
        record.dateDelivered || record.dateReceived || record.updatedAt,
      ),
      by: record.staff?.deliveredBy || record.staff?.warehouseBy || "-",
      description: "Warehouse marked the requisition as delivered",
    },
  };

  if (overallStatus === "Cancelled") {
    return [
      {
        ...stepDetails["Parts Requested"],
        isCompleted: true,
        isCurrent: false,
      },
      {
        status: "Cancelled",
        dateTime: formatDateTime(record.dateCancelled || record.updatedAt),
        by: record.staff?.requisitioner || "-",
        description: "Requisition was cancelled",
        isCurrent: true,
        isCompleted: false,
      },
    ];
  }

  return statusSteps.map((step, index) => ({
    ...stepDetails[step],
    dateTime: index <= currentStepIndex ? stepDetails[step].dateTime : "Pending",
    by: index <= currentStepIndex ? stepDetails[step].by : "-",
    isCompleted: index < currentStepIndex,
    isCurrent: index === currentStepIndex,
  }));
};

const mapRequisitionToCard = (record) => {
  const items = (Array.isArray(record.items) ? record.items : []).map(
    (item) => ({
      ...item,
      stockStatus: normalizeItemStatus(item.stockStatus),
      availableQty: Number(item.availableQty) || 0,
    }),
  );
  const totalQuantity = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0),
    0,
  );
  const firstItem = items[0];
  const firstItemParticular = getItemParticular(firstItem);
  const rawStatus = normalizeOverallStatus(record.status);
  const reviewed = hasWarehouseAssessment({ ...record, items });

  return {
    ...record,
    id: record._id,
    slipNo: record.wrsNo,
    status: rawStatus,
    rawStatus,
    hasWarehouseAssessment: reviewed,
    requestedBy: record.staff?.requisitioner || "-",
    aircraft: record.aircraft || "-",
    itemSummary: firstItem
      ? items.length === 1
        ? `${firstItemParticular || "-"} x ${firstItem.quantity} ${firstItem.unitOfMeasure || ""}`.trim()
        : `${firstItemParticular || "-"} +${items.length - 1} more`
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
      overallStatus: rawStatus,
      rawStatus,
      hasWarehouseAssessment: reviewed,
      requestItems: items.map((item) => ({
        itemName: getItemParticular(item) || "-",
        purpose: item.purpose || "-",
        requested: `${item.quantity || 0} ${item.unitOfMeasure || ""}`.trim(),
        availableQty: `${item.availableQty || 0}`,
        status: item.stockStatus,
      })),
      timeline: buildTimeline({ ...record, status: rawStatus, items }),
      rawRecord: { ...record, status: rawStatus, items },
    },
  };
};

const resolveTabForRequest = (request, isManager) => {
  if (!request) {
    return null;
  }

  if (isManager) {
    return request.hasWarehouseAssessment &&
      !["Approved", "Delivered", "Cancelled"].includes(request.rawStatus)
      ? "For Review"
      : "History";
  }

  return request.rawStatus === "Parts Requested" &&
    !request.hasWarehouseAssessment
    ? "Active"
    : "History";
};

export default function PartsRequisition({ route, navigation }) {
  const { user } = useContext(AuthContext);
  const { fetchNotifications } = useContext(NotificationContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("Active");
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [editingRequest, setEditingRequest] = useState(null);
  const [requisitions, setRequisitions] = useState([]);
  const [aircraftOptions, setAircraftOptions] = useState([]);
  const [selectedAircraft, setSelectedAircraft] = useState("");
  const [loading, setLoading] = useState(false);

  const userRole = user?.jobTitle?.toLowerCase() || "engineer";
  const isManager = ["maintenance manager", "officer-in-charge"].includes(
    userRole,
  );
  const tabLabels = isManager
    ? ["For Review", "History"]
    : ["Active", "History"];

  useEffect(() => {
    setSelectedTab(isManager ? "For Review" : "Active");
  }, [isManager]);

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
      showToast("Failed to fetch parts requisitions.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAircraftOptions = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/parts-monitoring/aircraft-list`,
      );

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

  useFocusEffect(
    useCallback(() => {
      fetchRequisitions();
      fetchNotifications();
    }, [fetchNotifications, fetchRequisitions]),
  );

  useEffect(() => {
    if (!route?.params?.refreshAt) {
      return;
    }

    fetchRequisitions();
    fetchNotifications();
  }, [fetchNotifications, fetchRequisitions, route?.params?.refreshAt]);

  const mappedRequisitions = useMemo(
    () => requisitions.map(mapRequisitionToCard),
    [requisitions],
  );

  const filteredRequisitions = useMemo(() => {
    const sourceData = mappedRequisitions.filter((item) => {
      if (isManager) {
        return selectedTab === "For Review"
          ? item.hasWarehouseAssessment &&
              !["Approved", "Delivered", "Cancelled"].includes(item.rawStatus)
          : ["Approved", "Delivered", "Cancelled"].includes(item.rawStatus);
      }

      return selectedTab === "Active"
        ? item.rawStatus === "Parts Requested" && !item.hasWarehouseAssessment
        : !(
            item.rawStatus === "Parts Requested" && !item.hasWarehouseAssessment
          );
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
  }, [isManager, mappedRequisitions, searchQuery, selectedTab]);

  useEffect(() => {
    const targetRequestId = route?.params?.targetRequestId;

    if (!targetRequestId || mappedRequisitions.length === 0) {
      return;
    }

    const matchedRequest = mappedRequisitions.find(
      (item) => item.id === targetRequestId,
    );

    if (!matchedRequest) {
      return;
    }

    const nextTab = resolveTabForRequest(matchedRequest, isManager);

    if (nextTab && nextTab !== selectedTab) {
      setSelectedTab(nextTab);
    }

    setSelectedRequest(matchedRequest.requestDetails);
    setShowDetailsModal(true);
    navigation?.setParams?.({
      refreshAt: undefined,
      targetRequestId: undefined,
      notificationStatus: undefined,
    });
  }, [
    isManager,
    mappedRequisitions,
    navigation,
    route?.params?.targetRequestId,
    selectedTab,
  ]);

  const handleNewEntry = () => {
    setEditingRequest(null);
    setSelectedAircraft("");
    setShowNewEntryModal(true);
  };

  const handleViewDetails = (item) => {
    setSelectedRequest(item.requestDetails);
    setShowDetailsModal(true);
  };

  const handleEdit = (item) => {
    setEditingRequest(item);
    setSelectedAircraft(item.aircraft || "");
    setShowNewEntryModal(true);
  };

  const buildRequestItemsPayload = (items) =>
    items.map((item, index) => ({
      itemNo: index + 1,
      particular: item.particular.trim(),
      quantity: Number(item.quantity),
      unitOfMeasure: item.unit,
      purpose: item.purpose.trim(),
      availableQty: 0,
      stockStatus: "Parts Requested",
    }));

  const resetEntryModal = () => {
    setShowNewEntryModal(false);
    setEditingRequest(null);
    setSelectedAircraft("");
  };

  const submitRequisitionUpdate = useCallback(
    async (requestId, payload, successMessage) => {
      try {
        const token = await AsyncStorage.getItem("currentUserToken");
        const response = await fetch(
          `${API_BASE}/api/parts-requisition/update-requisition/${requestId}`,
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
        resetEntryModal();
        await fetchRequisitions();

        if (successMessage) {
          showToast(successMessage);
        }
      } catch (error) {
        console.error("Error updating requisition:", error);
        showToast(error.message || "Failed to update requisition.");
      }
    },
    [fetchRequisitions],
  );

  const handleCancelRequest = async (item) => {
    const existingItems = item.requestDetails?.rawRecord?.items || [];

    await submitRequisitionUpdate(
      item.id,
      {
        status: "Cancelled",
        dateCancelled: new Date().toISOString(),
        items: existingItems.map((requestItem) => ({
          ...requestItem,
          stockStatus: "Cancelled",
        })),
      },
      `${item.slipNo} cancelled successfully.`,
    );
  };

  const handleDelete = (item) => {
    Alert.alert("Cancel Requisition", `Cancel ${item.slipNo}?`, [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        style: "destructive",
        onPress: () => handleCancelRequest(item),
      },
    ]);
  };

  const handleSubmitNewEntry = async ({ aircraft, items }) => {
    if (!aircraft) {
      showToast("Please choose an aircraft.");
      return;
    }

    if (!items?.length) {
      showToast("Please add at least one item.");
      return;
    }

    if (
      items.some(
        (item) =>
          !item.particular.trim() ||
          !item.quantity ||
          Number(item.quantity) <= 0,
      )
    ) {
      showToast("Particular, and quantity are required for each item.");
      return;
    }

    const fullName =
      `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
      "Unknown User";
    const requestItems = buildRequestItemsPayload(items);

    try {
      if (editingRequest) {
        await submitRequisitionUpdate(
          editingRequest.id,
          {
            aircraft,
            items: requestItems,
          },
          `${editingRequest.slipNo} updated successfully.`,
        );
        return;
      }

      const highestSlipNumber = mappedRequisitions.reduce((highest, item) => {
        const numericPart = Number(item.slipNo?.replace("WRS-", "")) || 0;
        return numericPart > highest ? numericPart : highest;
      }, 0);
      const nextSlipNumber = highestSlipNumber + 1;
      const nextSlipNo = `WRS-${String(nextSlipNumber).padStart(3, "0")}`;
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
          body: JSON.stringify({
            wrsNo: nextSlipNo,
            aircraft,
            staff: {
              requisitioner: fullName,
              approvedBy: "",
              receiver: "",
              notedBy: "",
              warehouseBy: "",
              deliveredBy: "",
            },
            items: requestItems,
            dateRequested: new Date().toISOString(),
            status: "Parts Requested",
          }),
        },
      );

      if (!response.ok) {
        const errorData = await parseJsonSafely(response);
        throw new Error(errorData?.message || "Failed to create requisition");
      }

      resetEntryModal();
      setSelectedTab("Active");
      await fetchRequisitions();
      showToast(`${nextSlipNo} added successfully.`);
    } catch (error) {
      console.error("Error creating requisition:", error);
      showToast(error.message || "Failed to create requisition.");
    }
  };

  const handleOrderRequest = async (request) => {
    const updatedItems = (request.rawRecord.items || []).map((item) => ({
      ...item,
      stockStatus:
        normalizeItemStatus(item.stockStatus) === "Out of Stock"
          ? "To Be Ordered"
          : normalizeItemStatus(item.stockStatus),
    }));

    await submitRequisitionUpdate(
      request.id,
      {
        status: "To Be Ordered",
        dateOrdered: new Date().toISOString(),
        items: updatedItems,
      },
      `${request.requestId} marked as to be restocked.`,
    );
  };

  const handleApproveRequest = async (request) => {
    const fullName =
      `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
      "Unknown User";
    const updatedItems = (request.rawRecord.items || []).map((item) => ({
      ...item,
      stockStatus: "Approved",
    }));

    await submitRequisitionUpdate(
      request.id,
      {
        status: "Approved",
        dateApproved: new Date().toISOString(),
        approvedBy: fullName,
        items: updatedItems,
      },
      `${request.requestId} approved successfully.`,
    );
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
            borderRadius: 7,
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

  const initialEditItems = editingRequest
    ? editingRequest.requestDetails.rawRecord.items.map((item) => ({
        id: item._id,
        particular: getItemParticular(item),
        quantity: item.quantity,
        unitOfMeasure: item.unitOfMeasure,
        purpose: item.purpose,
      }))
    : [];
  const detailRequestItems = selectedRequest?.requestItems || [];
  const hasMissingItems = detailRequestItems.some(
    (item) => normalizeItemStatus(item.status) === "Out of Stock",
  );
  const allItemsAvailable =
    detailRequestItems.length > 0 &&
    detailRequestItems.every((item) => isItemAvailableForApproval(item.status));
  const canOrder =
    isManager &&
    selectedTab === "For Review" &&
    selectedRequest?.hasWarehouseAssessment &&
    ["Parts Requested", "Availability Checked"].includes(
      selectedRequest?.rawStatus,
    ) &&
    hasMissingItems;
  const canApprove =
    isManager &&
    selectedTab === "For Review" &&
    selectedRequest?.hasWarehouseAssessment &&
    !["Approved", "Delivered", "Cancelled"].includes(
      selectedRequest?.rawStatus,
    ) &&
    allItemsAvailable;
  const orderLabel =
    selectedRequest &&
    ["To Be Ordered", "Ordered", "Approved", "Delivered"].includes(
      selectedRequest.rawStatus,
    )
      ? "Restocked"
      : "Order";

  return (
    <View
      style={{ flex: 1, backgroundColor: COLORS.grayLight, paddingTop: 10 }}
    >
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
              placeholder="Search by WRS#"
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

          {!isManager && (
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
            showActions={!isManager}
            actionsDisabled={!isManager && selectedTab === "History"}
            loading={loading}
          />
        </ScrollView>
      </View>

      {!isManager && (
        <PartsRequisitionEntry
          visible={showNewEntryModal}
          onClose={resetEntryModal}
          onSubmit={handleSubmitNewEntry}
          selectedAircraft={selectedAircraft}
          onChangeAircraft={setSelectedAircraft}
          aircraftOptions={aircraftOptions}
          initialAircraft={editingRequest?.aircraft || ""}
          initialItems={initialEditItems}
          title={editingRequest ? "Edit Request" : "New Entry"}
          submitLabel={editingRequest ? "Save Changes" : "Submit"}
        />
      )}

      <PartsRequisitionDetails
        visible={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        request={selectedRequest}
        showManagerActions={isManager && selectedTab === "For Review"}
        canOrder={canOrder}
        canApprove={canApprove}
        orderLabel={orderLabel}
        approveLabel="Approve"
        onOrder={handleOrderRequest}
        onApprove={handleApproveRequest}
      />
    </View>
  );
}
