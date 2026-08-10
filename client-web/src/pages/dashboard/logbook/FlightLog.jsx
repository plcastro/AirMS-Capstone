import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Input,
  Row,
  Col,
  Button,
  Space,
  Modal,
  Typography,
  Select,
  Card,
  Grid,
  Tooltip,
} from "antd";
import {
  CheckCircleOutlined,
  CheckOutlined,
  PlusOutlined,
  SearchOutlined,
  ExportOutlined,
  EyeOutlined,
  EditOutlined,
  NotificationOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { AuthContext } from "../../../context/AuthContext";
import { API_BASE } from "../../../utils/API_BASE";
import FlightLogEntry from "../../../components/pagecomponents/FlightLogEntry";
import { useLocation, useNavigate } from "react-router-dom";
import { exportFlightLogToPDF } from "../../../components/common/ExportFile";
import PinVerifiedSignatureModal from "../../../components/common/PinVerifiedSignatureModal";
import ResultPopup from "../../../components/common/ResultPopup";
import FLogTable from "../../../components/tables/FLogTable";
import "./flightlog.css";
import { isDateLikeSearchQuery, matchesSearch } from "../../../utils/search";
import { canExportModule } from "../../../../../shared/exportAccess";

const { Text } = Typography;
const { useBreakpoint } = Grid;

export default function FlightLog() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const actionButtonStyles = {
    accept: { background: "#048a25", borderColor: "#048a25", color: "#fff" },
    complete: { background: "#048a25", borderColor: "#048a25", color: "#fff" },
    edit: { background: "#faad14", borderColor: "#faad14", color: "#1f1f1f" },
    export: { background: "#1677ff", borderColor: "#1677ff", color: "#fff" },
    notify: { background: "#fa8c16", borderColor: "#fa8c16", color: "#fff" },
    release: { background: "#048a25", borderColor: "#048a25", color: "#fff" },
    view: { background: "#f0f2f5", borderColor: "#d9d9d9", color: "#344054" },
  };
  const formatDisplayDate = (value) => {
    if (!value) return "N/A";

    const raw = String(value).trim();

    // Keep already-formatted dates as-is.
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      return raw;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return raw;
    }

    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    const year = parsed.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const { user, getAuthHeader } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAircraft, setSelectedAircraft] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [flightLogs, setFlightLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [saving, setSaving] = useState(false);
  const [entryModalVisible, setEntryModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const hasRunRemoteSearchRef = useRef(false);
  const [workflowModal, setWorkflowModal] = useState({
    open: false,
    action: null,
    log: null,
  });
  const [signatureWorkflow, setSignatureWorkflow] = useState({
    open: false,
    action: null,
    log: null,
  });
  const pendingWorkflowPopupRef = useRef(null);
  const pendingSignaturePopupRef = useRef(null);

  const [popup, setPopup] = useState({
    open: false,
    status: "success",
    title: "",
    subTitle: "",
  });

  const userRole = user?.jobTitle?.toLowerCase() || "pilot";
  const isPilot = userRole === "pilot";
  const isOfficerInCharge = userRole === "officer-in-charge";
  const canExportFlightLogs = canExportModule(userRole, "flightLogs");
  const isMechanic = [
    "engineer",
    "mechanic",
    "maintenance manager",
    "superadmin",
    "head of maintenance",
  ].includes(userRole);

  const normalizeStatusFilterValue = useCallback((statusValue) => {
    if (statusValue === "released") {
      return "pending_acceptance";
    }
    if (statusValue === "for_completion") {
      return "accepted";
    }

    return statusValue || "all";
  }, []);

  const normalizeFlightLogStatus = (statusValue = "") =>
    String(statusValue || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

  const getComparableStatus = useCallback((statusValue = "") => {
    const normalized = normalizeFlightLogStatus(statusValue);
    if (["ongoing", "draft"].includes(normalized)) {
      return "pending_release";
    }
    if (normalized === "released") {
      return "pending_acceptance";
    }
    return normalized;
  }, []);

  const mergeFlightLogPages = (pages = []) =>
    Array.from(
      new Map(
        pages
          .flatMap((page) => (Array.isArray(page?.data) ? page.data : []))
          .map((log) => [log._id || log.id, log]),
      ).values(),
    );

  const getFlightLogDateTime = (log = {}) => {
    const dateCandidates = [
      log.date,
      log.flightDate,
      log.createdAt,
      log.updatedAt,
    ].filter(Boolean);

    for (const value of dateCandidates) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.getTime();
      }
    }

    return 0;
  };

  const sortFlightLogsByDate = (logs = []) =>
    [...logs].sort((left, right) => {
      const dateDifference =
        getFlightLogDateTime(right) - getFlightLogDateTime(left);

      if (dateDifference !== 0) {
        return dateDifference;
      }

      return String(right.createdAt || right._id || "").localeCompare(
        String(left.createdAt || left._id || ""),
      );
    });

  const hasDestinationInfo = (log = {}) =>
    Array.isArray(log.legs) &&
    log.legs.some(
      (leg) =>
        Array.isArray(leg?.stations) &&
        leg.stations.some(
          (station) =>
            String(station?.from || "").trim() &&
            String(station?.to || "").trim(),
        ),
    );

  const fetchFlightLogs = useCallback(
    async (options = {}) => {
      const { silent = false } = options;
      try {
        if (!silent) {
          setLoading(true);
        }

        const params = new URLSearchParams();
        params.append("page", "1");
        params.append("limit", "500");

        if (selectedAircraft && selectedAircraft !== "all") {
          params.append("aircraftRPC", selectedAircraft);
        }
        if (selectedStatus && selectedStatus !== "all") {
          params.append("status", normalizeStatusFilterValue(selectedStatus));
        }

        const fetchPage = async (page, extraParams = {}) => {
          const pageParams = new URLSearchParams(params);
          pageParams.set("page", String(page));
          Object.entries(extraParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
              pageParams.set(key, value);
            }
          });
          const response = await fetch(
            `${API_BASE}/api/flightlogs?${pageParams.toString()}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            },
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || "Failed to fetch flight logs");
          }

          return data;
        };

        const fetchAllPages = async (extraParams = {}) => {
          const firstPage = await fetchPage(1, extraParams);
          const totalPages = Number(firstPage.pagination?.pages || 1);
          const remainingPages =
            totalPages > 1
              ? await Promise.all(
                  Array.from({ length: totalPages - 1 }, (_, index) =>
                    fetchPage(index + 2, extraParams),
                  ),
                )
              : [];

          return [firstPage, ...remainingPages];
        };

        const allPages = await fetchAllPages();
        const pendingReleasePages =
          selectedStatus === "all"
            ? await fetchAllPages({ status: "pending_release" })
            : [];

        setFlightLogs(
          sortFlightLogsByDate(
            mergeFlightLogPages([...allPages, ...pendingReleasePages]),
          ),
        );
      } catch (error) {
        console.error("Fetch flight logs error:", error);
        setPopup({
          open: true,
          status: "error",
          title: "Operation failed!",
          subTitle: error.message || "Failed to fetch flight logs",
        });
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [normalizeStatusFilterValue, selectedAircraft, selectedStatus],
  );

  const fetchFlightLogById = useCallback(async (flightLogId) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/flightlogs/${flightLogId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (!response.ok || !data?.success || !data?.data) {
        return null;
      }

      return data.data;
    } catch (error) {
      console.error("Fetch flight log by id error:", error);
      return null;
    }
  }, []);

  const searchFlightLogs = async (query) => {
    if (!query.trim()) {
      fetchFlightLogs();
      return;
    }

    if (isDateLikeSearchQuery(query)) {
      await fetchFlightLogs({ silent: true });
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE}/api/flightlogs/search?q=${encodeURIComponent(query)}&limit=300`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to search flight logs");
      }

      setFlightLogs(sortFlightLogsByDate(data.data || []));
    } catch (error) {
      console.error("Search flight logs error:", error);
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: error.message || "Failed to search flight logs",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNew = async (newEntry) => {
    try {
      setSaving(true);
      const authHeader = getAuthHeader ? await getAuthHeader() : {};

      const response = await fetch(`${API_BASE}/api/flightlogs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-action-confirmed": "true",
          ...authHeader,
        },
        body: JSON.stringify({
          ...newEntry,
          createdByName:
            `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
            "Unknown User",
          createdByUserId: user?.id || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to add flight log");
      }

      await fetchFlightLogs();
      setEntryModalVisible(false);
      setPopup({
        open: true,
        status: "success",
        title: "Flight log added",
        subTitle: "The flight log has been added successfully.",
      });
    } catch (error) {
      console.error("Create flight log error:", error);
      setPopup({
        open: true,
        status: "error",
        title: "Flight log added failed",
        subTitle: "Failed to add flight log.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (record) => {
    setSelectedLog(record);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async (data) => {
    if (!selectedLog?._id) return;

    try {
      setSaving(true);
      const authHeader = getAuthHeader ? await getAuthHeader() : {};

      const response = await fetch(
        `${API_BASE}/api/flightlogs/${selectedLog._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-action-confirmed": "true",
            ...authHeader,
          },
          body: JSON.stringify({
            ...selectedLog,
            ...data,
            _id: selectedLog._id,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to update flight log");
      }

      await fetchFlightLogs();
      setEditModalVisible(false);
      setSelectedLog(null);
      setPopup({
        open: true,
        status: "success",
        title: "Flight log updated",
        subTitle: "The flight log has been successfully updated.",
      });
    } catch (error) {
      console.error("Update flight log error:", error);
      setPopup({
        open: true,
        status: "error",
        title: "Updated failed",
        subTitle: "Failed to update flight log.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (record) => {
    await exportFlightLogToPDF(record, { setPopup });
  };

  const getUserDisplayName = () => {
    const fullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
    return fullName || user?.username || userRole || "Unknown";
  };

  const buildToDateData = (log) => {
    const broughtForward = log?.componentData?.broughtForwardData || {};
    const thisFlight = log?.componentData?.thisFlightData || {};

    return {
      airframe:
        (parseFloat(broughtForward.airframe) || 0) +
        (parseFloat(thisFlight.airframe) || 0),
      gearBoxMain:
        (parseFloat(broughtForward.gearBoxMain) || 0) +
        (parseFloat(thisFlight.gearBoxMain) || 0),
      gearBoxTail:
        (parseFloat(broughtForward.gearBoxTail) || 0) +
        (parseFloat(thisFlight.gearBoxTail) || 0),
      rotorMain:
        (parseFloat(broughtForward.rotorMain) || 0) +
        (parseFloat(thisFlight.rotorMain) || 0),
      rotorTail:
        (parseFloat(broughtForward.rotorTail) || 0) +
        (parseFloat(thisFlight.rotorTail) || 0),
      engine:
        (parseFloat(broughtForward.engine) || 0) +
        (parseFloat(thisFlight.engine) || 0),
      cycleN1:
        (parseFloat(broughtForward.cycleN1) || 0) +
        (parseFloat(thisFlight.cycleN1) || 0),
      cycleN2:
        (parseFloat(broughtForward.cycleN2) || 0) +
        (parseFloat(thisFlight.cycleN2) || 0),
      landingCycle:
        (parseFloat(broughtForward.landingCycle) || 0) +
        (parseFloat(thisFlight.landingCycle) || 0),
      usage:
        (parseFloat(broughtForward.usage) || 0) +
        (parseFloat(thisFlight.usage) || 0),
      airframeNextInsp:
        thisFlight.airframeNextInsp || broughtForward.airframeNextInsp || "",
      engineNextInsp:
        thisFlight.engineNextInsp || broughtForward.engineNextInsp || "",
    };
  };

  const openWorkflowModal = (action, log) => {
    if (action === "release" || action === "accept") {
      setSignatureWorkflow({ open: true, action, log });
      return;
    }

    setWorkflowModal({ open: true, action, log });
  };

  const closeWorkflowModal = () => {
    setWorkflowModal({ open: false, action: null, log: null });
  };

  const closeSignatureWorkflow = () => {
    setSignatureWorkflow({ open: false, action: null, log: null });
  };

  const queueWorkflowResult = (payload) => {
    pendingWorkflowPopupRef.current = payload;
    closeWorkflowModal();
  };

  const queueSignatureResult = (payload) => {
    pendingSignaturePopupRef.current = payload;
    closeSignatureWorkflow();
  };

  const runSignedWorkflowForLog = async (action, log) => {
    if (!log?._id) return;
    setSignatureWorkflow({ open: true, action, log });
  };

  const runNotifyWorkflowForLog = async (log) => {
    if (!log?._id) return;

    if (!hasDestinationInfo(log)) {
      setPopup({
        open: true,
        status: "error",
        title: "Flight log failed",
        subTitle:
          "Add at least one complete From-To station in Destination/s before notifying for completion.",
      });
      return;
    }

    setWorkflowModal({ open: true, action: "notify", log });
  };

  const runCompleteWorkflowForLog = async (log) => {
    if (!log?._id) return;
    setWorkflowModal({ open: true, action: "complete", log });
  };

  const handleSignedWorkflowAction = async (signature) => {
    const { action, log } = signatureWorkflow;
    if (!action || !log?._id) return;

    try {
      setSaving(true);
      const authHeader = getAuthHeader ? await getAuthHeader() : {};
      let successResult = null;

      if (action === "release") {
        const response = await fetch(
          `${API_BASE}/api/flightlogs/${log._id}/release`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "x-action-confirmed": "true",
              ...authHeader,
            },
            body: JSON.stringify({
              name: getUserDisplayName(),
              signature,
            }),
          },
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Failed to release flight log");
        }
        successResult = {
          open: true,
          status: "success",
          title: "Flight log released",
          subTitle: "The flight log has been successfully released.",
        };
      }

      if (action === "accept") {
        const response = await fetch(
          `${API_BASE}/api/flightlogs/${log._id}/accept`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "x-action-confirmed": "true",
              ...authHeader,
            },
            body: JSON.stringify({
              name: getUserDisplayName(),
              signature,
              userRole: "pilot",
            }),
          },
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Failed to accept flight log");
        }
        successResult = {
          open: true,
          status: "success",
          title: "Flight log accepted",
          subTitle: "The flight log has been successfully accepted.",
        };
      }

      if (successResult) queueSignatureResult(successResult);
      await fetchFlightLogs();
    } catch (error) {
      console.error("Signed workflow action error:", error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleWorkflowAction = async () => {
    const { action, log } = workflowModal;
    if (!action || !log?._id) return;

    try {
      setSaving(true);

      if (action === "notify") {
        if (!hasDestinationInfo(log)) {
          throw new Error(
            "Add at least one complete From-To station in Destination/s before notifying for completion.",
          );
        }

        const response = await fetch(`${API_BASE}/api/flightlogs/${log._id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-action-confirmed": "true",
            ...(getAuthHeader ? await getAuthHeader() : {}),
          },
          body: JSON.stringify({
            ...log,
            _id: log._id,
            notifiedForCompletion: true,
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Failed to notify mechanic");
        }
        queueWorkflowResult({
          open: true,
          status: "success",
          title: "Mechanic notified",
          subTitle:
            "The flight log has been successfully notified for completion.",
        });
      }

      if (action === "complete") {
        const toDateData =
          log?.componentData?.toDateData &&
          Object.keys(log.componentData.toDateData).length > 0
            ? log.componentData.toDateData
            : buildToDateData(log);

        const aircraft = log.aircraft || log.rpc;
        if (!aircraft) {
          throw new Error("Aircraft identifier is missing");
        }

        const totalsResponse = await fetch(
          `${API_BASE}/api/parts-monitoring/${encodeURIComponent(aircraft)}/update-totals`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "x-action-confirmed": "true",
              ...(getAuthHeader ? await getAuthHeader() : {}),
            },
            body: JSON.stringify({
              acftTT: Number(toDateData.airframe) || 0,
              n1Cycles: Number(toDateData.cycleN1) || 0,
              n2Cycles: Number(toDateData.cycleN2) || 0,
              landings: Number(toDateData.landingCycle) || 0,
              updatedBy: getUserDisplayName(),
            }),
          },
        );
        const totalsData = await totalsResponse.json();
        if (!totalsResponse.ok) {
          throw new Error(
            totalsData.message || "Failed to update aircraft totals",
          );
        }

        const completeResponse = await fetch(
          `${API_BASE}/api/flightlogs/${log._id}/complete`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "x-action-confirmed": "true",
              ...(getAuthHeader ? await getAuthHeader() : {}),
            },
          },
        );
        const completeData = await completeResponse.json();
        if (!completeResponse.ok) {
          throw new Error(
            completeData.message || "Failed to complete flight log",
          );
        }
        queueWorkflowResult({
          open: true,
          status: "success",
          title: "Flight log completed",
          subTitle: "The flight log has been successfully completed.",
        });
      }

      await fetchFlightLogs();
    } catch (error) {
      console.error("Workflow action error:", error);
      queueWorkflowResult({
        open: true,
        status: "error",
        title: "Flight log failed",
        subTitle: error.message || "Failed to complete flight log.",
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchFlightLogs();
  }, [fetchFlightLogs]);

  useEffect(() => {
    const stream = new EventSource(`${API_BASE}/api/events/stream`);
    const onDataChanged = () => {
      fetchFlightLogs({ silent: true });
    };

    stream.addEventListener("data-changed", onDataChanged);

    return () => {
      stream.removeEventListener("data-changed", onDataChanged);
      stream.close();
    };
  }, [fetchFlightLogs]);

  useEffect(() => {
    const trimmedSearch = searchQuery.trim();

    if (!trimmedSearch) {
      if (hasRunRemoteSearchRef.current) {
        hasRunRemoteSearchRef.current = false;
        fetchFlightLogs();
      }
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      hasRunRemoteSearchRef.current = true;
      searchFlightLogs(trimmedSearch);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [fetchFlightLogs, searchQuery]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const targetFlightLogId = params.get("targetFlightLogId");
    const notificationStatus = params.get("notificationStatus");
    const refreshAt = params.get("refreshAt");

    if (!targetFlightLogId && !refreshAt) {
      return;
    }

    setSelectedAircraft("");
    if (notificationStatus) {
      setSelectedStatus(
        normalizeStatusFilterValue(notificationStatus || "all"),
      );
    }
    fetchFlightLogs();
  }, [fetchFlightLogs, location.search, normalizeStatusFilterValue]);

  const aircraftOptions = useMemo(
    () => ["all", ...new Set(flightLogs.map((log) => log.rpc).filter(Boolean))],
    [flightLogs],
  );

  const statusOptions = [
    { label: "ALL STATUS", value: "all" },
    { label: "PENDING RELEASE", value: "pending_release" },
    { label: "RELEASED", value: "pending_acceptance" },
    { label: "ACCEPTED", value: "accepted" },
    { label: "FOR COMPLETION", value: "for_completion" },
    { label: "COMPLETED", value: "completed" },
  ];

  const filteredLogs = useMemo(() => {
    const trimmedSearch = searchQuery.trim();
    const shouldApplyLocalSearch =
      trimmedSearch && isDateLikeSearchQuery(trimmedSearch);

    return sortFlightLogsByDate(
      flightLogs.filter((log) => {
        const matchesSearchText =
          !shouldApplyLocalSearch || matchesSearch(trimmedSearch, log);

        const matchesAircraft =
          selectedAircraft === "" ||
          selectedAircraft === "all" ||
          log.rpc === selectedAircraft;

        const normalizedStatus = getComparableStatus(log.status);
        const matchesStatus =
          selectedStatus === "all" ||
          (selectedStatus === "for_completion"
            ? normalizedStatus === "accepted" && log.notifiedForCompletion
            : selectedStatus === "accepted"
              ? normalizedStatus === "accepted" && !log.notifiedForCompletion
              : normalizedStatus ===
                getComparableStatus(normalizeStatusFilterValue(selectedStatus)));

        return matchesSearchText && matchesAircraft && matchesStatus;
      }),
    );
  }, [
    flightLogs,
    getComparableStatus,
    normalizeStatusFilterValue,
    searchQuery,
    selectedAircraft,
    selectedStatus,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedAircraft, selectedStatus]);

  useEffect(() => {
    const openTargetFlightLog = async () => {
      const params = new URLSearchParams(location.search);
      const targetFlightLogId = params.get("targetFlightLogId");

      if (!targetFlightLogId) {
        return;
      }

      let matchedLog = flightLogs.find((log) => log._id === targetFlightLogId);

      if (!matchedLog) {
        matchedLog = await fetchFlightLogById(targetFlightLogId);
      }

      if (!matchedLog) {
        return;
      }

      setSelectedLog(matchedLog);
      setEditModalVisible(true);
      navigate("/dashboard/flight-log", { replace: true });
    };

    openTargetFlightLog();
  }, [fetchFlightLogById, flightLogs, location.search, navigate]);

  const isPilotAcceptableStatus = (status) =>
    ["pending_acceptance", "released"].includes(
      normalizeFlightLogStatus(status),
    );

  const isCompletedFlightLog = (record = {}) =>
    normalizeFlightLogStatus(record.status) === "completed";

  const getStatusMeta = (record = {}) => {
    const status = normalizeFlightLogStatus(record.status);

    if (status === "pending_release" || status === "ongoing") {
      return {
        label: "Pending Release",
        className: "fl-badge--pending-release",
      };
    }
    if (status === "pending_acceptance" || status === "released") {
      return { label: "Released", className: "fl-badge--released" };
    }
    if (status === "accepted" && record.notifiedForCompletion) {
      return { label: "For Completion", className: "fl-badge--for-completion" };
    }
    if (status === "accepted") {
      return { label: "Accepted", className: "fl-badge--accepted" };
    }
    if (status === "completed") {
      return { label: "Completed", className: "fl-badge--completed" };
    }

    return { label: "Pending Release", className: "fl-badge--pending-release" };
  };

  const getStatusBadge = (record) => {
    const statusMeta = getStatusMeta(record);
    return (
      <span className={`fl-badge ${statusMeta.className}`}>
        {statusMeta.label}
      </span>
    );
  };

  const columns = [
    { title: "RP/C", dataIndex: "rpc", key: "rpc", width: 120 },
    {
      title: "Aircraft Type",
      dataIndex: "aircraftType",
      key: "aircraftType",
      width: 140,
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: 120,
      render: (value) => formatDisplayDate(value),
      sorter: (left, right) =>
        getFlightLogDateTime(left) - getFlightLogDateTime(right),
      defaultSortOrder: "descend",
    },
    {
      title: "Control",
      dataIndex: "controlNo",
      key: "controlNo",
      width: 120,
      ellipsis: true,
    },
    {
      title: "Status",
      key: "status",
      width: 100,
      render: (_, record) => getStatusBadge(record),
    },
    {
      title: "Action",
      key: "action",
      width: 120,
      render: (_, record) => {
        const isViewOnly = isOfficerInCharge || isCompletedFlightLog(record);
        return (
          <Space size={12} wrap>
          <Tooltip title={isViewOnly ? "View" : "Edit"}>
            <Button
              type={isViewOnly ? "default" : "primary"}
              size="small"
              aria-label={isViewOnly ? "View" : "Edit"}
              style={
                isViewOnly
                  ? actionButtonStyles.view
                  : actionButtonStyles.edit
              }
              onClick={() => handleEdit(record)}
              icon={isViewOnly ? <EyeOutlined /> : <EditOutlined />}
            />
          </Tooltip>
          {!isOfficerInCharge &&
            isMechanic &&
            record.status === "pending_release" && (
              <Tooltip title="Release">
                <Button
                  size="small"
                  aria-label="Release"
                  style={actionButtonStyles.release}
                  icon={<SendOutlined />}
                  onClick={() => openWorkflowModal("release", record)}
                />
              </Tooltip>
            )}
          {isPilot && isPilotAcceptableStatus(record.status) && (
            <Tooltip title="Accept">
              <Button
                size="small"
                aria-label="Accept"
                style={actionButtonStyles.accept}
                icon={<CheckOutlined />}
                onClick={() => openWorkflowModal("accept", record)}
              />
            </Tooltip>
          )}
          {isPilot &&
            record.status === "accepted" &&
            !record.notifiedForCompletion && (
              <Tooltip title="Notify">
                <Button
                  size="small"
                  aria-label="Notify"
                  style={actionButtonStyles.notify}
                  icon={<NotificationOutlined />}
                  onClick={() => openWorkflowModal("notify", record)}
                />
              </Tooltip>
            )}
          {!isOfficerInCharge &&
            isMechanic &&
            record.status === "accepted" &&
            record.notifiedForCompletion && (
              <Tooltip title="Complete">
                <Button
                  size="small"
                  aria-label="Complete"
                  style={actionButtonStyles.complete}
                  icon={<CheckCircleOutlined />}
                  onClick={() => openWorkflowModal("complete", record)}
                />
              </Tooltip>
            )}
          {canExportFlightLogs && (
            <Tooltip title="Export">
              <Button
                size="small"
                aria-label="Export"
                style={actionButtonStyles.export}
                icon={<ExportOutlined />}
                onClick={() => handleExport(record)}
              />
            </Tooltip>
          )}
        </Space>
        );
      },
    },
  ];

  const renderCard = (record) => {
    const statusMeta = getStatusMeta(record);
    const isViewOnly = isOfficerInCharge || isCompletedFlightLog(record);
    return (
      <Card
        key={record._id || record.id}
        hoverable
        style={{ marginBottom: 10, borderRadius: 10 }}
        styles={{ body: { padding: 12 } }}
        onClick={() => handleEdit(record)}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              {record.rpc || "N/A"}
            </div>
            <div style={{ color: "#667085", fontSize: 12 }}>
              {formatDisplayDate(record.date)}
            </div>
          </div>
          <span className={`fl-badge ${statusMeta.className}`}>
            {statusMeta.label}
          </span>
        </div>

        <div style={{ marginTop: 8, color: "#475467", fontSize: 12 }}>
          Aircraft: {record.aircraftType || "N/A"}
        </div>
        <div style={{ color: "#475467", fontSize: 12 }}>
          Control: {record.controlNo || record.control || "N/A"}
        </div>

        <Space size={12} wrap style={{ marginTop: 10 }}>
          <Tooltip title={isViewOnly ? "View" : "Edit"}>
            <Button
              type={isViewOnly ? "default" : "primary"}
              size="small"
              aria-label={isViewOnly ? "View" : "Edit"}
              style={
                isViewOnly
                  ? actionButtonStyles.view
                  : actionButtonStyles.edit
              }
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(record);
              }}
              icon={isViewOnly ? <EyeOutlined /> : <EditOutlined />}
            />
          </Tooltip>
          {!isOfficerInCharge &&
            isMechanic &&
            record.status === "pending_release" && (
              <Tooltip title="Release">
                <Button
                  size="small"
                  aria-label="Release"
                  style={actionButtonStyles.release}
                  icon={<SendOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    openWorkflowModal("release", record);
                  }}
                />
              </Tooltip>
            )}
          {isPilot && isPilotAcceptableStatus(record.status) && (
            <Tooltip title="Accept">
              <Button
                size="small"
                aria-label="Accept"
                style={actionButtonStyles.accept}
                icon={<CheckOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  openWorkflowModal("accept", record);
                }}
              />
            </Tooltip>
          )}
          {isPilot &&
            record.status === "accepted" &&
            !record.notifiedForCompletion && (
              <Tooltip title="Notify">
                <Button
                  size="small"
                  aria-label="Notify"
                  style={actionButtonStyles.notify}
                  icon={<NotificationOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    openWorkflowModal("notify", record);
                  }}
                />
              </Tooltip>
            )}
          {!isOfficerInCharge &&
            isMechanic &&
            record.status === "accepted" &&
            record.notifiedForCompletion && (
              <Tooltip title="Complete">
                <Button
                  size="small"
                  aria-label="Complete"
                  style={actionButtonStyles.complete}
                  icon={<CheckCircleOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    openWorkflowModal("complete", record);
                  }}
                />
              </Tooltip>
            )}
          {canExportFlightLogs && (
            <Tooltip title="Export">
              <Button
                size="small"
                aria-label="Export"
                style={actionButtonStyles.export}
                icon={<ExportOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleExport(record);
                }}
              />
            </Tooltip>
          )}
        </Space>
      </Card>
    );
  };

  return (
    <div className="fl-page">
      <Card style={{ marginBottom: 10 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={8}>
            <Input
              size="large"
              className="fl-search"
              placeholder="Search by RP/C, type, or date"
              prefix={<SearchOutlined />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={12} sm={12} md={4}>
            <Select
              size="large"
              style={{ width: "100%" }}
              value={selectedAircraft || "all"}
              onChange={(value) =>
                setSelectedAircraft(value === "all" ? "" : value)
              }
              options={aircraftOptions.map((aircraft) => ({
                value: aircraft,
                label:
                  aircraft === "all" ? "All Aircraft" : `RP/C: ${aircraft}`,
              }))}
            />
          </Col>
          <Col xs={12} sm={12} md={5}>
            <Select
              size="large"
              style={{ width: "100%" }}
              value={selectedStatus}
              onChange={setSelectedStatus}
              options={statusOptions}
            />
          </Col>
          {!isOfficerInCharge && (
            <Col xs={12} md={7}>
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                onClick={() => setEntryModalVisible(true)}
              >
                New Entry
              </Button>
            </Col>
          )}
        </Row>
      </Card>

      <FLogTable
        columns={columns}
        dataSource={filteredLogs}
        loading={loading}
        rowKey={(record) => record._id || record.id}
        renderCard={renderCard}
        mobileCardBreakpoint="xs"
        pagination={{
          pageSize,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50"],
          current: currentPage,
          onChange: (page, nextPageSize) => {
            setPageSize(nextPageSize);
            setCurrentPage(nextPageSize !== pageSize ? 1 : page);
          },
          showLessItems: isMobile,
          size: isMobile ? "small" : "default",
          placement: isMobile ? "bottom" : "bottomEnd",
        }}
        scroll={{ x: "max-content" }}
        locale={{
          emptyText:
            searchQuery || selectedAircraft || selectedStatus !== "all"
              ? "No flight logs found"
              : "No flight logs yet",
        }}
      />
      <Row gutter={[10, 10]} style={{ marginTop: 8, marginBottom: 16 }}>
        <Col span={24} style={{ textAlign: "right" }}>
          <Text type="secondary">
            Showing <Text strong>{filteredLogs.length}</Text> flight log(s)
          </Text>
        </Col>
      </Row>

      <FlightLogEntry
        visible={entryModalVisible}
        onClose={() => setEntryModalVisible(false)}
        onSave={handleSaveNew}
        userRole={userRole}
        editMode={false}
      />

      {selectedLog && (
        <FlightLogEntry
          visible={editModalVisible}
          onClose={() => {
            setEditModalVisible(false);
            setSelectedLog(null);
          }}
          onSave={handleSaveEdit}
          userRole={userRole}
          editMode={true}
          initialData={selectedLog}
          initialComponentData={selectedLog.componentData}
          readOnly={isOfficerInCharge || isCompletedFlightLog(selectedLog)}
          onRelease={(log) => runSignedWorkflowForLog("release", log)}
          onAccept={(log) => runSignedWorkflowForLog("accept", log)}
          onNotify={runNotifyWorkflowForLog}
          onComplete={runCompleteWorkflowForLog}
          workflowLoading={saving}
        />
      )}

      <PinVerifiedSignatureModal
        open={signatureWorkflow.open}
        zIndex={6000}
        title={
          signatureWorkflow.action === "release"
            ? "Flight Log - Release"
            : "Flight Log - Accept"
        }
        description={
          signatureWorkflow.action === "release"
            ? "Draw your release signature below. This signature will be attached to the flight log and sent to the pilot for acceptance."
            : "Draw your acceptance signature below. This signature will be attached to the flight log as pilot acceptance."
        }
        confirmDescription={
          signatureWorkflow.action === "release"
            ? "Enter your 6-digit PIN to confirm that you want to sign and release this flight log."
            : "Enter your 6-digit PIN to confirm that you want to sign and accept this flight log."
        }
        onCancel={closeSignatureWorkflow}
        onSave={handleSignedWorkflowAction}
        afterOpenChange={(isOpen) => {
          if (!isOpen && pendingSignaturePopupRef.current) {
            setPopup(pendingSignaturePopupRef.current);
            pendingSignaturePopupRef.current = null;
          }
        }}
      />

      <Modal
        open={workflowModal.open}
        onCancel={closeWorkflowModal}
        onOk={handleWorkflowAction}
        confirmLoading={saving}
        destroyOnHidden
        afterOpenChange={(isOpen) => {
          if (!isOpen && pendingWorkflowPopupRef.current) {
            setPopup(pendingWorkflowPopupRef.current);
            pendingWorkflowPopupRef.current = null;
          }
        }}
        rootClassName="fl-workflow-confirm-modal"
        wrapClassName="fl-workflow-confirm-wrap"
        zIndex={5000}
        okText="OK"
        cancelText="Cancel"
        title={
          workflowModal.action === "notify"
            ? "Flight Log - Notify Mechanic"
            : "Flight Log - Complete"
        }
      >
        {workflowModal.action === "notify" && (
          <p>
            Notify the mechanic that this accepted flight log is ready for
            completion?
          </p>
        )}
        {workflowModal.action === "complete" && (
          <p>
            Complete this flight log and update parts-monitoring totals from its
            to-date values?
          </p>
        )}
      </Modal>
      <ResultPopup
        open={popup.open}
        zIndex={7000}
        status={popup.status}
        title={popup.title}
        subTitle={popup.subTitle}
        onClose={() => setPopup((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
