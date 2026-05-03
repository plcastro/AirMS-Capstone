import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Input,
  Row,
  Col,
  Button,
  Table,
  Space,
  message,
  Modal,
  Typography,
  Select,
  Card,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  ExportOutlined,
  EyeOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { AuthContext } from "../../../context/AuthContext";
import { API_BASE } from "../../../utils/API_BASE";
import FlightLogEntry from "../../../components/pagecomponents/FlightLogEntry";
import { useLocation, useNavigate } from "react-router-dom";
import { exportFlightLogToPDF } from "../../../components/common/ExportFile";
import PinVerifiedSignatureModal from "../../../components/common/PinVerifiedSignatureModal";
import "./flightlog.css";

const { Title, Text } = Typography;

export default function FlightLog() {
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
  const [saving, setSaving] = useState(false);
  const [entryModalVisible, setEntryModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
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

  const userRole = user?.jobTitle?.toLowerCase() || "pilot";
  const isPilot = userRole === "pilot";
  const isOfficerInCharge = userRole === "officer-in-charge";
  const isMechanic = [
    "engineer",
    "mechanic",
    "maintenance manager",
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

        setFlightLogs(mergeFlightLogPages([...allPages, ...pendingReleasePages]));
      } catch (error) {
        console.error("Fetch flight logs error:", error);
        message.error(error.message || "Failed to fetch flight logs");
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

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE}/api/flightlogs/search?q=${encodeURIComponent(query)}&limit=500`,
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

      setFlightLogs(data.data || []);
    } catch (error) {
      console.error("Search flight logs error:", error);
      message.error(error.message || "Failed to search flight logs");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNew = async (newEntry) => {
    try {
      setSaving(true);

      const response = await fetch(`${API_BASE}/api/flightlogs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
      message.success("Flight log added successfully");
    } catch (error) {
      console.error("Create flight log error:", error);
      message.error(error.message || "Failed to add flight log");
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

      const response = await fetch(
        `${API_BASE}/api/flightlogs/${selectedLog._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
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
      message.success("Flight log updated successfully");
    } catch (error) {
      console.error("Update flight log error:", error);
      message.error(error.message || "Failed to update flight log");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (record) => {
    await exportFlightLogToPDF(record);
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

  const handleSignedWorkflowAction = async (signature) => {
    const { action, log } = signatureWorkflow;
    if (!action || !log?._id) return;

    try {
      setSaving(true);
      const authHeader = getAuthHeader ? await getAuthHeader() : {};

      if (action === "release") {
        const response = await fetch(
          `${API_BASE}/api/flightlogs/${log._id}/release`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...authHeader },
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
        message.success("Flight log released");
      }

      if (action === "accept") {
        const response = await fetch(
          `${API_BASE}/api/flightlogs/${log._id}/accept`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...authHeader },
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
        message.success("Flight log accepted");
      }

      closeSignatureWorkflow();
      await fetchFlightLogs();
    } catch (error) {
      console.error("Signed workflow action error:", error);
      message.error(error.message || "Flight log workflow action failed");
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
        message.success("Mechanic notified for completion");
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
            headers: { "Content-Type": "application/json" },
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
        message.success("Flight log completed");
      }

      closeWorkflowModal();
      await fetchFlightLogs();
    } catch (error) {
      console.error("Workflow action error:", error);
      message.error(error.message || "Flight log workflow action failed");
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
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchFlightLogs(searchQuery);
      } else {
        fetchFlightLogs();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [fetchFlightLogs, searchQuery]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const targetFlightLogId = params.get("targetFlightLogId");
    const notificationStatus = params.get("notificationStatus");

    if (!targetFlightLogId) {
      return;
    }

    setSelectedAircraft("");
    setSelectedStatus(normalizeStatusFilterValue(notificationStatus || "all"));
  }, [location.search, normalizeStatusFilterValue]);

  const aircraftOptions = useMemo(
    () => ["all", ...new Set(flightLogs.map((log) => log.rpc).filter(Boolean))],
    [flightLogs],
  );

  const statusOptions = [
    { label: "All Status", value: "all" },
    { label: "Pending Release", value: "pending_release" },
    { label: "Released", value: "pending_acceptance" },
    { label: "Accepted", value: "accepted" },
    { label: "For Completion", value: "for_completion" },
    { label: "Completed", value: "completed" },
  ];

  const filteredLogs = flightLogs.filter((log) => {
    const matchesSearch =
      searchQuery === "" ||
      log.rpc?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.aircraftType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(log.date || "").includes(searchQuery);

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

    return matchesSearch && matchesAircraft && matchesStatus;
  });

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
      width: 320,

      render: (_, record) => (
        <Space size={4} wrap>
          <Button
            type={isOfficerInCharge ? "default" : "primary"}
            size="small"
            onClick={() => handleEdit(record)}
            icon={isOfficerInCharge ? <EyeOutlined /> : <EditOutlined />}
          >
            {isOfficerInCharge ? "View" : "Edit"}
          </Button>
          {!isOfficerInCharge &&
            isMechanic &&
            record.status === "pending_release" && (
              <Button
                size="small"
                onClick={() => openWorkflowModal("release", record)}
              >
                Release
              </Button>
            )}
          {isPilot && isPilotAcceptableStatus(record.status) && (
            <Button
              size="small"
              onClick={() => openWorkflowModal("accept", record)}
            >
              Accept
            </Button>
          )}
          {isPilot &&
            record.status === "accepted" &&
            !record.notifiedForCompletion && (
              <Button
                size="small"
                onClick={() => openWorkflowModal("notify", record)}
              >
                Notify
              </Button>
            )}
          {!isOfficerInCharge &&
            isMechanic &&
            record.status === "accepted" &&
            record.notifiedForCompletion && (
              <Button
                size="small"
                onClick={() => openWorkflowModal("complete", record)}
              >
                Complete
              </Button>
            )}
          <Button
            type="text"
            size="small"
            icon={<ExportOutlined />}
            onClick={() => handleExport(record)}
          />
        </Space>
      ),
    },
  ];

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
          <Col xs={24} sm={12} md={4}>
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
          <Col xs={24} sm={12} md={5}>
            <Select
              size="large"
              style={{ width: "100%" }}
              value={selectedStatus}
              onChange={setSelectedStatus}
              options={statusOptions}
            />
          </Col>
          {!isOfficerInCharge && (
            <Col xs={24} md={4} style={{ textAlign: "right" }}>
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

      <Table
        className="fl-table"
        columns={columns}
        dataSource={filteredLogs}
        loading={loading}
        rowKey={(record) => record._id || record.id}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ x: 1100 }}
        locale={{
          emptyText:
            searchQuery || selectedAircraft || selectedStatus !== "all"
              ? "No flight logs found"
              : "No flight logs yet",
        }}
        size="small"
      />
      <Col span={24} style={{ textAlign: "left", margin: "16px 0" }}>
        <Text type="secondary">
          Showing <Text strong>{filteredLogs.length}</Text> flight log(s)
        </Text>
      </Col>

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
          readOnly={isOfficerInCharge}
        />
      )}

      <PinVerifiedSignatureModal
        open={signatureWorkflow.open}
        title={
          signatureWorkflow.action === "release"
            ? "Release Flight Log"
            : "Accept Flight Log"
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
      />

      <Modal
        open={workflowModal.open}
        onCancel={closeWorkflowModal}
        onOk={handleWorkflowAction}
        confirmLoading={saving}
        okText="OK"
        cancelText="Cancel"
        title={
          workflowModal.action === "notify"
            ? "Notify Mechanic"
            : "Complete Flight Log"
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
    </div>
  );
}
