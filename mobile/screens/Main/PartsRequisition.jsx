import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AppText from "../../components/common/AppText";
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
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
import AlertComp from "../../components/AlertComp";
import { SearchBar } from "../../components/common/MobileModule";
import { API_BASE } from "../../utilities/API_BASE";
import { exportPartsRequisitionExcel } from "../../utilities/documentExport";
import { exportReportPdf } from "../../utilities/reportExport";
import { showToast } from "../../utilities/toast";
import { matchesSearch } from "../../utilities/search";
import { resolveUserRole } from "../../../shared/navigationAccess";
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

const getRequisitionDateValue = (record = {}) => {
  if (typeof record === "string" || record instanceof Date) {
    return record;
  }
  return record.dateRequested || record.createdAt || "";
};

const getRequisitionTimestamp = (record = {}) => {
  const parsedDate = new Date(getRequisitionDateValue(record));
  return Number.isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime();
};

const normalizeOverallStatus = (status) => {
  const normalizedStatus = String(status || "").trim().toLowerCase();

  switch (normalizedStatus) {
    case "parts requested":
    case "pending":
      return "Parts Requested";
    case "availability checked":
      return "Availability Checked";
    case "to be ordered":
      return "To Be Ordered";
    case "ordered":
      return "Ordered";
    case "approved":
      return "Approved";
    case "delivered":
    case "completed":
      return "Delivered";
    case "cancelled":
    case "canceled":
    case "rejected":
      return "Cancelled";
    case "in progress":
      return "Ordered";
    default:
      return status || "Parts Requested";
  }
};

const normalizeItemStatus = (status) => {
  const normalizedStatus = String(status || "").trim().toLowerCase();

  switch (normalizedStatus) {
    case "parts requested":
      return "Parts Requested";
    case "out of stock":
      return "Out of Stock";
    case "in stock":
      return "In Stock";
    case "to be ordered":
      return "To Be Ordered";
    case "ordered":
    case "ready for pickup":
      return "Ordered";
    case "approved":
      return "Approved";
    case "delivered":
      return "Delivered";
    case "cancelled":
    case "canceled":
      return "Cancelled";
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

const getItemStockStatus = (item, availableQty) => {
  const currentStatus = normalizeItemStatus(item.stockStatus);

  if (["Approved", "Delivered", "Cancelled"].includes(currentStatus)) {
    return currentStatus;
  }

  if (["To Be Ordered", "Ordered"].includes(currentStatus)) {
    return Number(availableQty) >= Number(item.quantity || 0)
      ? "Ordered"
      : "To Be Ordered";
  }

  return Number(availableQty) >= Number(item.quantity || 0)
    ? "In Stock"
    : "Out of Stock";
};

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

const getStaffTitle = (staff = {}, key, fallback = "-") =>
  staff?.[`${key}Title`] || fallback;

const getStaffActor = (staff = {}, key, fallback = "-") =>
  [staff?.[key], getStaffTitle(staff, key, "")].filter(Boolean).join(" - ") ||
  fallback;

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
      by: getStaffActor(record.staff, "requisitioner", "-"),
      description: `Request submitted with ${record.items?.length || 0} item(s)`,
    },
    "Availability Checked": {
      status: "Availability Checked",
      dateTime: formatDateTime(
        record.dateWarehouseReviewed || record.updatedAt,
      ),
      by: getStaffActor(record.staff, "warehouseBy", "Warehouse Staff"),
      description: "Warehouse reviewed item stock availability",
    },
    "To Be Ordered": {
      status: "To Be Ordered",
      dateTime: formatDateTime(record.dateOrdered || record.updatedAt),
      by: getStaffActor(record.staff, "approvedBy", "Maintenance Review"),
      description: "Unavailable items were marked to be restocked",
    },
    Ordered: {
      status: "Ordered",
      dateTime: formatDateTime(record.updatedAt),
      by: getStaffActor(record.staff, "warehouseBy", "Warehouse Staff"),
      description: "Warehouse confirmed the restocked items are available",
    },
    Approved: {
      status: "Approved",
      dateTime: formatDateTime(record.dateApproved || record.updatedAt),
      by: getStaffActor(record.staff, "approvedBy", "-"),
      description: "Requisition approved",
    },
    Delivered: {
      status: "Delivered",
      dateTime: formatDateTime(
        record.dateDelivered || record.dateReceived || record.updatedAt,
      ),
      by:
        getStaffActor(record.staff, "deliveredBy", "") ||
        getStaffActor(record.staff, "warehouseBy", "-"),
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
        by: getStaffActor(record.staff, "requisitioner", "-"),
        description: "Requisition was cancelled",
        isCurrent: true,
        isCompleted: false,
      },
    ];
  }

  return statusSteps.map((step, index) => ({
    ...stepDetails[step],
    dateTime:
      index <= currentStepIndex ? stepDetails[step].dateTime : "Pending",
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
    rawRecord: { ...record, status: rawStatus, items },
    sortDate: getRequisitionDateValue(record),
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
    if (request.rawStatus === "To Be Ordered") {
      return "To Be Restocked";
    }
    if (request.rawStatus === "Ordered") {
      return "Restocked";
    }
    if (request.rawStatus === "Approved") {
      return "Approved";
    }
    return ["Delivered", "Cancelled"].includes(request.rawStatus)
      ? "Closed"
      : "For Review";
  }

  if (["Delivered", "Cancelled"].includes(request.rawStatus)) {
    return "Closed";
  }

  if (request.rawStatus === "Approved") {
    return "Approved";
  }

  return "Pending";
};

const canManagerActOnRequest = (request) =>
  ["Availability Checked", "Ordered"].includes(request?.rawStatus);

const buildPartsRequisitionReportSections = (items = [], selectedTab = "All") => {
  const statusCounts = items.reduce((counts, item) => {
    const label = getDisplayStatusLabel(item.rawStatus || item.status || "N/A");
    counts[label] = (counts[label] || 0) + 1;
    return counts;
  }, {});

  return [
    {
      title: "Summary",
      columns: ["Metric", "Value"],
      rows: [
        ["Filter", selectedTab],
        ["Total Requisitions", items.length],
        [
          "Total Items",
          items.reduce((sum, item) => sum + Number(item.totalItems || 0), 0),
        ],
        [
          "Total Quantity",
          items.reduce((sum, item) => sum + Number(item.totalQuantity || 0), 0),
        ],
      ],
    },
    {
      title: "Status Distribution",
      columns: ["Status", "Count"],
      rows: Object.entries(statusCounts),
    },
    {
      title: "Requisitions",
      columns: [
        "WRS No.",
        "Aircraft",
        "Requester",
        "Date Requested",
        "Status",
        "Items",
        "Total Qty",
      ],
      rows: items.map((item) => [
        item.slipNo || "N/A",
        item.aircraft || "N/A",
        item.requestedBy || "N/A",
        item.dateRequested || "N/A",
        getDisplayStatusLabel(item.rawStatus || item.status || "N/A"),
        item.totalItems || 0,
        item.totalQuantity || 0,
      ]),
    },
  ];
};

export default function PartsRequisition({ route, navigation }) {
  const { user } = useContext(AuthContext);
  const { fetchNotifications } = useContext(NotificationContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("Pending");
  const [showTabDropdown, setShowTabDropdown] = useState(false);
  const [dateSortOrder, setDateSortOrder] = useState("newest");
  const [showDateSortDropdown, setShowDateSortDropdown] = useState(false);
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [editingRequest, setEditingRequest] = useState(null);
  const [requisitions, setRequisitions] = useState([]);
  const [aircraftOptions, setAircraftOptions] = useState([]);
  const [selectedAircraft, setSelectedAircraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [exportingReport, setExportingReport] = useState(false);
  const hasLoadedRef = useRef(false);
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    confirmText: "OK",
    cancelText: "Cancel",
    onConfirm: null,
    onCancel: null,
  });

  const userRole = resolveUserRole(user);
  const getCurrentUserTitle = useCallback(
    (fallback = "User") => user?.jobTitle || user?.access || fallback,
    [user?.access, user?.jobTitle],
  );
  const isWarehouse = userRole === "warehouse staff";
  const isMechanic = userRole === "mechanic";
  const isManager = [
    "superadmin",
    "maintenance manager",
    "officer-in-charge",
  ].includes(userRole);
  const canRequestParts = ![
    "superadmin",
    "maintenance manager",
    "officer-in-charge",
    "warehouse staff",
  ].includes(userRole);
  const tabLabels = isManager
    ? [
        "All",
        "For Review",
        "To Be Restocked",
        "Restocked",
        "Approved",
        "Closed",
      ]
    : isWarehouse
      ? [
          "All",
          "Parts Requested",
          "Availability Checked",
          "To Be Restocked",
          "Restocked",
          "Approved",
          "Closed",
        ]
      : ["All", "Pending", "Approved", "Closed"];
  const defaultTab = isManager
    ? "For Review"
    : isWarehouse
      ? "Parts Requested"
      : "Pending";

  useEffect(() => {
    setSelectedTab(defaultTab);
  }, [defaultTab]);

  const closeAlert = () => {
    setAlertConfig((current) => ({ ...current, visible: false }));
  };

  const showAlert = ({ title, message, confirmText = "OK" }) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      confirmText,
      cancelText: "Cancel",
      onConfirm: closeAlert,
      onCancel: null,
    });
  };

  const confirmWithAlert = ({
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
  }) =>
    new Promise((resolve) => {
      const finish = (result) => {
        setAlertConfig((current) => ({ ...current, visible: false }));
        resolve(result);
      };

      setAlertConfig({
        visible: true,
        title,
        message,
        confirmText,
        cancelText,
        onConfirm: () => finish(true),
        onCancel: () => finish(false),
      });
    });

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

  const fetchRequisitions = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }
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
      if (!silent) {
        setLoading(false);
      }
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
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    fetchRequisitions();
    fetchAircraftOptions();
  }, [fetchAircraftOptions, fetchRequisitions]);

  useEffect(() => {
    if (typeof EventSource === "undefined") return undefined;

    const stream = new EventSource(`${API_BASE}/api/events/stream`);
    const onDataChanged = async (event) => {
      let payload = {};
      try {
        payload = JSON.parse(event?.data || "{}");
      } catch {
        payload = {};
      }
      const url = String(payload?.url || "");
      if (
        !url.startsWith("/api/parts-requisition") &&
        !url.startsWith("/api/requisitions")
      ) {
        return;
      }
      await fetchRequisitions({ silent: true });
      await fetchNotifications();
    };

    stream.addEventListener("data-changed", onDataChanged);

    return () => {
      stream.removeEventListener("data-changed", onDataChanged);
      stream.close();
    };
  }, [fetchNotifications, fetchRequisitions]);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications]),
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
      if (selectedTab === "All") {
        return true;
      }

      if (isManager) {
        if (selectedTab === "For Review") {
          return canManagerActOnRequest(item);
        }
        if (selectedTab === "To Be Restocked") {
          return item.rawStatus === "To Be Ordered";
        }
        if (selectedTab === "Restocked") {
          return item.rawStatus === "Ordered";
        }
        if (selectedTab === "Approved") {
          return item.rawStatus === "Approved";
        }
        return ["Delivered", "Cancelled"].includes(item.rawStatus);
      }

      if (isWarehouse) {
        if (selectedTab === "Parts Requested") {
          return item.rawStatus === "Parts Requested";
        }
        if (selectedTab === "Availability Checked") {
          return item.rawStatus === "Availability Checked";
        }
        if (selectedTab === "To Be Restocked") {
          return item.rawStatus === "To Be Ordered";
        }
        if (selectedTab === "Restocked") {
          return item.rawStatus === "Ordered";
        }
        if (selectedTab === "Approved") {
          return item.rawStatus === "Approved";
        }
        return ["Delivered", "Cancelled"].includes(item.rawStatus);
      }

      if (selectedTab === "Pending") {
        return !["Approved", "Delivered", "Cancelled"].includes(item.rawStatus);
      }
      if (selectedTab === "Approved") {
        return item.rawStatus === "Approved";
      }
      return ["Delivered", "Cancelled"].includes(item.rawStatus);
    });

    return sourceData
      .filter((item) => matchesSearch(searchQuery, item))
      .sort((left, right) => {
        const leftTime = getRequisitionTimestamp(left.sortDate || left.rawRecord);
        const rightTime = getRequisitionTimestamp(
          right.sortDate || right.rawRecord,
        );

        return dateSortOrder === "oldest"
          ? leftTime - rightTime
          : rightTime - leftTime;
      });
  }, [
    dateSortOrder,
    isManager,
    isWarehouse,
    mappedRequisitions,
    searchQuery,
    selectedTab,
  ]);

  const tabCounts = useMemo(
    () => ({
      All: mappedRequisitions.length,
      "For Review": mappedRequisitions.filter(canManagerActOnRequest).length,
      Pending: mappedRequisitions.filter(
        (item) =>
          !["Approved", "Delivered", "Cancelled"].includes(item.rawStatus),
      ).length,
      "Parts Requested": mappedRequisitions.filter(
        (item) => item.rawStatus === "Parts Requested",
      ).length,
      "Availability Checked": mappedRequisitions.filter(
        (item) => item.rawStatus === "Availability Checked",
      ).length,
      "To Be Restocked": mappedRequisitions.filter(
        (item) => item.rawStatus === "To Be Ordered",
      ).length,
      Restocked: mappedRequisitions.filter(
        (item) => item.rawStatus === "Ordered",
      ).length,
      Approved: mappedRequisitions.filter(
        (item) => item.rawStatus === "Approved",
      ).length,
      Closed: mappedRequisitions.filter((item) =>
        ["Delivered", "Cancelled"].includes(item.rawStatus),
      ).length,
    }),
    [mappedRequisitions],
  );

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
    async (
      requestId,
      payload,
      successMessage,
      { closeDetails = true } = {},
    ) => {
      try {
        const token = await AsyncStorage.getItem("currentUserToken");
        const response = await fetch(
          `${API_BASE}/api/parts-requisition/update-requisition/${requestId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-action-confirmed": "true",
              ...(token
                ? {
                    Authorization: `Bearer ${token}`,
                  }
                : {}),
            },
            body: JSON.stringify({
              ...payload,
              confirmAction: true,
            }),
          },
        );

        if (!response.ok) {
          const errorData = await parseJsonSafely(response);
          throw new Error(errorData?.message || "Failed to update requisition");
        }

        const updatedRecord = await parseJsonSafely(response);
        if (updatedRecord?._id) {
          setSelectedRequest(
            mapRequisitionToCard(updatedRecord).requestDetails,
          );
        }

        if (closeDetails) {
          setShowDetailsModal(false);
        }
        resetEntryModal();
        await fetchRequisitions();
        await fetchNotifications();

        if (successMessage) {
          showToast(successMessage);
        }
        return true;
      } catch (error) {
        console.error("Error updating requisition:", error);
        showToast(error.message || "Failed to update requisition.");
        return false;
      }
    },
    [fetchNotifications, fetchRequisitions],
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
    setAlertConfig({
      visible: true,
      title: "Cancel Requisition",
      message: `Cancel ${item.slipNo}?`,
      confirmText: "Yes",
      cancelText: "No",
      onCancel: closeAlert,
      onConfirm: async () => {
        closeAlert();
        await handleCancelRequest(item);
      },
    });
  };

  const handleExportMonitoringReport = async () => {
    if (!isWarehouse || exportingReport) return;

    if (filteredRequisitions.length === 0) {
      showToast("No requisition data available for the report.");
      return;
    }

    setExportingReport(true);
    try {
      const exportDate = new Date();
      const dateStamp = `${exportDate.getFullYear()}-${String(
        exportDate.getMonth() + 1,
      ).padStart(2, "0")}-${String(exportDate.getDate()).padStart(2, "0")}`;
      await exportReportPdf({
        title: "Parts Requisition Monitoring Report",
        fileName: `Parts-Requisition-Monitoring-Report-${dateStamp}.pdf`,
        sections: buildPartsRequisitionReportSections(
          filteredRequisitions,
          selectedTab,
        ),
      });
      showToast("PDF Exported!");
    } catch (error) {
      console.error("Parts requisition PDF export failed:", error);
      showToast(error.message || "Failed to export parts requisition report.");
    } finally {
      setExportingReport(false);
    }
  };

  const handleSubmitNewEntry = async ({ aircraft, items }) => {
    if (!aircraft) {
      showAlert({
        title: "Missing Aircraft",
        message: "Please choose an aircraft.",
      });
      return;
    }

    if (!items?.length) {
      showAlert({
        title: "Missing Items",
        message: "Please add at least one item.",
      });
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
      showAlert({
        title: "Incomplete Item",
        message: "Particular and quantity are required for each item.",
      });
      return;
    }

    const fullName =
      `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
      "Unknown User";
    const requestItems = buildRequestItemsPayload(items);

    try {
      if (editingRequest) {
        const confirmedEdit = await confirmWithAlert({
          title: "Update Requisition",
          message: `Save changes to ${editingRequest.slipNo}?`,
          confirmText: "Save",
        });
        if (!confirmedEdit) return;

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
      const confirmedCreate = await confirmWithAlert({
        title: "Submit Requisition",
        message: `Submit new requisition ${nextSlipNo}?`,
        confirmText: "Submit",
      });
      if (!confirmedCreate) return;

      const token = await AsyncStorage.getItem("currentUserToken");
      const response = await fetch(
        `${API_BASE}/api/parts-requisition/create-requisition`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-action-confirmed": "true",
            ...(token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {}),
          },
          body: JSON.stringify({
            wrsNo: nextSlipNo,
            aircraft,
            confirmAction: true,
            staff: {
              requisitioner: fullName,
              requisitionerTitle: getCurrentUserTitle("Requester"),
              approvedBy: "",
              approvedByTitle: "",
              receiver: "",
              receiverTitle: "",
              notedBy: "",
              notedByTitle: "",
              warehouseBy: "",
              warehouseByTitle: "",
              deliveredBy: "",
              deliveredByTitle: "",
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
      setSelectedTab(defaultTab);
      await fetchRequisitions();
      await fetchNotifications();
      showToast(`${nextSlipNo} added successfully.`);
    } catch (error) {
      console.error("Error creating requisition:", error);
      showToast(error.message || "Failed to create requisition.");
    }
  };

  const handleOrderRequest = async (request) => {
    const confirmed = await confirmWithAlert({
      title: "Mark for Restock",
      message: `Mark ${request.requestId} as to be restocked?`,
      confirmText: "Confirm",
    });
    if (!confirmed) return;

    const updatedItems = (request.rawRecord.items || []).map((item) => ({
      ...item,
      stockStatus:
        Number(item.availableQty || 0) < Number(item.quantity || 0)
          ? "To Be Ordered"
          : normalizeItemStatus(item.stockStatus),
    }));

    await submitRequisitionUpdate(
      request.id,
      {
        status: "To Be Ordered",
        dateOrdered: new Date().toISOString(),
        approvedBy: getCurrentUserName("Reviewer"),
        approvedByTitle: getCurrentUserTitle("Reviewer"),
        items: updatedItems,
      },
      `${request.requestId} marked as to be restocked.`,
    );
  };

  const handleApproveRequest = async (request) => {
    const confirmed = await confirmWithAlert({
      title: "Approve Requisition",
      message: `Approve ${request.requestId}?`,
      confirmText: "Approve",
    });
    if (!confirmed) return;

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
        approvedByTitle: getCurrentUserTitle("Reviewer"),
        items: updatedItems,
      },
      `${request.requestId} approved successfully.`,
    );
  };

  const getCurrentUserName = (fallback) =>
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || fallback;

  const handleSubmitStockReview = async (request, updatedItems) => {
    const hasPartialOrZeroStock = updatedItems.some(
      (item) => Number(item.availableQty) < Number(item.quantity),
    );

    if (hasPartialOrZeroStock) {
      const confirmed = await confirmWithAlert({
        title: "Submit Stock Review",
        message:
          "Some items have partial or zero available quantity. Submit stock review anyway?",
        confirmText: "Submit",
      });
      if (!confirmed) return;
    }

    await submitRequisitionUpdate(
      request.id,
      {
        dateWarehouseReviewed: new Date().toISOString(),
        warehouseBy: getCurrentUserName("Warehouse Staff"),
        warehouseByTitle: getCurrentUserTitle("Warehouse Staff"),
        items: updatedItems,
      },
      "Warehouse stock review submitted successfully.",
    );
  };

  const handleSaveRestock = async (request, updatedItems) => {
    await submitRequisitionUpdate(
      request.id,
      {
        status: "To Be Ordered",
        warehouseBy: getCurrentUserName("Warehouse Staff"),
        warehouseByTitle: getCurrentUserTitle("Warehouse Staff"),
        items: updatedItems,
      },
      "Remaining items are still to be restocked.",
      { closeDetails: false },
    );
  };

  const handleMarkRestocked = async (request, updatedItems) => {
    const hasInsufficientStock = updatedItems.some(
      (item) => Number(item.availableQty) < Number(item.quantity),
    );
    const nextStatus = hasInsufficientStock ? "To Be Ordered" : "Ordered";

    const confirmed = await confirmWithAlert({
      title: "Mark as Restocked",
      message: `Mark ${request.requestId} as restocked?`,
      confirmText: "Restocked",
    });
    if (!confirmed) return false;

    return submitRequisitionUpdate(
      request.id,
      {
        status: nextStatus,
        dateOrdered: new Date().toISOString(),
        warehouseBy: getCurrentUserName("Warehouse Staff"),
        warehouseByTitle: getCurrentUserTitle("Warehouse Staff"),
        items: updatedItems,
      },
      nextStatus === "Ordered"
        ? "Requisition marked as restocked."
        : "Remaining items are still to be restocked.",
    );
  };

  const handleMarkDelivered = async (request) => {
    const confirmed = await confirmWithAlert({
      title: "Mark Delivered",
      message: `Mark ${request.requestId} as delivered?`,
      confirmText: "Delivered",
    });
    if (!confirmed) return;

    await submitRequisitionUpdate(
      request.id,
      {
        status: "Delivered",
        dateDelivered: new Date().toISOString(),
        dateReceived: new Date().toISOString(),
        deliveredBy: getCurrentUserName("Warehouse Staff"),
        deliveredByTitle: getCurrentUserTitle("Warehouse Staff"),
        warehouseBy: getCurrentUserName("Warehouse Staff"),
        warehouseByTitle: getCurrentUserTitle("Warehouse Staff"),
        items: (request.rawRecord.items || []).map((item) => ({
          ...item,
          stockStatus: "Delivered",
        })),
      },
      "Requisition marked as delivered.",
    );
  };

  const selectTab = (label) => {
    setSelectedTab(label);
    setShowTabDropdown(false);
  };

  const toggleDateSortDropdown = () => {
    setShowDateSortDropdown((open) => !open);
    setShowTabDropdown(false);
  };

  const toggleTabDropdown = () => {
    setShowTabDropdown((open) => !open);
    setShowDateSortDropdown(false);
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
    selectedRequest?.rawStatus === "Availability Checked" &&
    selectedRequest?.hasWarehouseAssessment &&
    ["Parts Requested", "Availability Checked"].includes(
      selectedRequest?.rawStatus,
    ) &&
    hasMissingItems;
  const canApprove =
    isManager &&
    (selectedRequest?.rawStatus === "Ordered" ||
      selectedRequest?.rawStatus === "Availability Checked") &&
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
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by WRS#"
            containerStyle={{ flex: 1, height: 48, marginBottom: 0 }}
          />

          {canRequestParts && (
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
              <AppText
                style={{
                  color: COLORS.white,
                  fontSize: 12,
                  fontWeight: "600",
                  marginLeft: 6,
                }}
              >
                Request
              </AppText>
            </TouchableOpacity>
          )}

          {isWarehouse && (
            <TouchableOpacity
              style={{
                backgroundColor:
                  exportingReport || filteredRequisitions.length === 0
                    ? COLORS.grayMedium
                    : COLORS.primaryLight,
                borderRadius: 10,
                height: 48,
                paddingHorizontal: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              }}
              activeOpacity={
                exportingReport || filteredRequisitions.length === 0 ? 1 : 0.8
              }
              disabled={exportingReport || filteredRequisitions.length === 0}
              onPress={handleExportMonitoringReport}
            >
              <MaterialCommunityIcons
                name="file-pdf-box"
                size={20}
                color={COLORS.white}
              />
              <AppText
                style={{
                  color: COLORS.white,
                  fontSize: 12,
                  fontWeight: "600",
                  marginLeft: 6,
                }}
              >
                {exportingReport ? "Exporting" : "PDF"}
              </AppText>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterControlsRow}>
          <View
            style={[
              styles.filterControlColumn,
              showDateSortDropdown ? styles.filterControlColumnOpen : null,
            ]}
          >
            <TouchableOpacity
              style={styles.unifiedFilterButton}
              activeOpacity={0.82}
              onPress={toggleDateSortDropdown}
            >
              <MaterialCommunityIcons
                name="tune"
                size={16}
                color={COLORS.primaryLight}
                style={{ marginRight: 6 }}
              />
              <AppText style={styles.unifiedFilterButtonText} numberOfLines={1}>
                {dateSortOrder === "oldest"
                  ? "Date: Oldest First"
                  : "Date: Newest First"}
              </AppText>
              <MaterialCommunityIcons
                name={showDateSortDropdown ? "chevron-up" : "chevron-down"}
                size={22}
                color={COLORS.grayDark}
              />
            </TouchableOpacity>

            {showDateSortDropdown && (
              <View style={styles.unifiedDropdownMenu}>
                {[
                  ["newest", "Newest First"],
                  ["oldest", "Oldest First"],
                ].map(([value, label], index) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.unifiedDropdownItem,
                      index === 0 ? styles.unifiedDropdownItemBordered : null,
                    ]}
                    onPress={() => {
                      setDateSortOrder(value);
                      setShowDateSortDropdown(false);
                    }}
                  >
                    <AppText style={styles.unifiedDropdownItemText}>
                      {label}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View
            style={[
              styles.filterControlColumn,
              showTabDropdown ? styles.filterControlColumnOpen : null,
            ]}
          >
            <TouchableOpacity
              style={styles.unifiedFilterButton}
              activeOpacity={0.82}
              onPress={toggleTabDropdown}
            >
              <MaterialCommunityIcons
                name="tune"
                size={16}
                color={COLORS.primaryLight}
                style={{ marginRight: 6 }}
              />
              <AppText style={styles.unifiedFilterButtonText} numberOfLines={1}>
                {selectedTab} ({tabCounts[selectedTab] || 0})
              </AppText>
              <MaterialCommunityIcons
                name={showTabDropdown ? "chevron-up" : "chevron-down"}
                size={22}
                color={COLORS.grayDark}
              />
            </TouchableOpacity>

            {showTabDropdown && (
              <View style={styles.unifiedDropdownMenu}>
                {tabLabels.map((label, index) => (
                  <TouchableOpacity
                    key={label}
                    style={[
                      styles.unifiedDropdownItem,
                      index < tabLabels.length - 1
                        ? styles.unifiedDropdownItemBordered
                        : null,
                    ]}
                    onPress={() => selectTab(label)}
                  >
                    <AppText style={styles.unifiedDropdownItemText}>
                      {label} ({tabCounts[label] || 0})
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => {
                fetchRequisitions();
                fetchNotifications();
              }}
              colors={[COLORS.primaryLight]}
            />
          }
        >
          <PartsRequisitionCards
            requisitions={filteredRequisitions}
            onViewDetails={handleViewDetails}
            onEdit={handleEdit}
            onDelete={handleDelete}
            showActions={!isManager && !isWarehouse && !isMechanic}
            actionsDisabled={!isManager && selectedTab !== "Pending"}
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
        showManagerActions={isManager && canManagerActOnRequest(selectedRequest)}
        showWarehouseActions={isWarehouse}
        canOrder={canOrder}
        canApprove={canApprove}
        orderLabel={orderLabel}
        approveLabel="Approve"
        onOrder={handleOrderRequest}
        onApprove={handleApproveRequest}
        getItemStockStatus={getItemStockStatus}
        onSubmitStockReview={handleSubmitStockReview}
        onSaveRestock={handleSaveRestock}
        onMarkRestocked={handleMarkRestocked}
        onMarkDelivered={handleMarkDelivered}
        onExportExcel={isWarehouse ? exportPartsRequisitionExcel : null}
      />

      <AlertComp
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  filterControlsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
    alignItems: "flex-start",
    zIndex: 20,
  },
  filterControlColumn: {
    flex: 1,
    minWidth: 0,
  },
  filterControlColumnOpen: {
    zIndex: 1000,
    elevation: 6,
  },
  unifiedFilterButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.grayMedium,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 48,
  },
  unifiedFilterButtonText: {
    flex: 1,
    color: COLORS.black,
    fontSize: 12,
    fontWeight: "600",
    marginRight: 8,
  },
  unifiedDropdownMenu: {
    position: "absolute",
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.grayMedium,
    borderRadius: 10,
    overflow: "hidden",
    zIndex: 1000,
    elevation: 5,
  },
  unifiedDropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  unifiedDropdownItemBordered: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayMedium,
  },
  unifiedDropdownItemText: {
    color: COLORS.black,
    fontSize: 12,
    fontWeight: "500",
  },
});
