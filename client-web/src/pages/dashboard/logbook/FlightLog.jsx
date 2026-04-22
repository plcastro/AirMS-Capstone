import React, {
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import {
  Input,
  Button,
  Table,
  Space,
  message,
  Modal,
  Select,
  Card,
  Row,
  Col,
  Tag,
  Typography,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  ExportOutlined,
} from "@ant-design/icons";
import { AuthContext } from "../../../context/AuthContext";
import { API_BASE } from "../../../utils/API_BASE";
import FlightLogEntry from "../../../components/pagecomponents/FlightLogEntry";
import { useLocation, useNavigate } from "react-router-dom";
import "./flightlog.css";

const { Text } = Typography;

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

  const { user } = useContext(AuthContext);
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

  const userRole = user?.jobTitle?.toLowerCase() || "pilot";
  const isPilot = userRole === "pilot";
  const isMechanic = [
    "engineer",
    "mechanic",
    "maintenance manager",
    "officer-in-charge",
    "head of maintenance",
  ].includes(userRole);

  const normalizeStatusFilterValue = useCallback((statusValue) => {
    if (statusValue === "released") {
      return "pending_acceptance";
    }

    return statusValue || "all";
  }, []);

  const fetchFlightLogs = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.append("page", "1");
      params.append("limit", "100");

      if (selectedAircraft && selectedAircraft !== "all") {
        params.append("aircraftRPC", selectedAircraft);
      }
      if (selectedStatus && selectedStatus !== "all") {
        params.append("status", normalizeStatusFilterValue(selectedStatus));
      }

      const response = await fetch(
        `${API_BASE}/api/flightlogs?${params.toString()}`,
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

      setFlightLogs(data.data || []);
    } catch (error) {
      console.error("Fetch flight logs error:", error);
      message.error(error.message || "Failed to fetch flight logs");
    } finally {
      setLoading(false);
    }
  }, [normalizeStatusFilterValue, selectedAircraft, selectedStatus]);

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
        `${API_BASE}/api/flightlogs/search?q=${encodeURIComponent(query)}&limit=100`,
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

  const handleExport = (record) => {
    console.log("Export log:", record);
    message.info(`Export log: ${record.rpc}`);
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
    setWorkflowModal({ open: true, action, log });
  };

  const closeWorkflowModal = () => {
    setWorkflowModal({ open: false, action: null, log: null });
  };

  const handleWorkflowAction = async () => {
    const { action, log } = workflowModal;
    if (!action || !log?._id) return;

    try {
      setSaving(true);

      if (action === "release") {
        const response = await fetch(
          `${API_BASE}/api/flightlogs/${log._id}/release`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: getUserDisplayName(),
              signature: user?.signature || getUserDisplayName(),
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
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: getUserDisplayName(),
              signature: user?.signature || getUserDisplayName(),
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

      if (action === "notify") {
        const response = await fetch(`${API_BASE}/api/flightlogs/${log._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
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
            headers: { "Content-Type": "application/json" },
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
    { label: "All", value: "all" },
    { label: "Pending Release", value: "pending_release" },
    { label: "Released", value: "pending_acceptance" },
    { label: "Accepted", value: "accepted" },
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

    const matchesStatus =
      selectedStatus === "all" ||
      log.status === normalizeStatusFilterValue(selectedStatus);

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
    ["pending_acceptance", "released"].includes(status);

  const getStatusBadge = (status) => {
    if (status === "pending_release") {
      return <Tag color="orange">Pending Release</Tag>;
    }
    if (status === "pending_acceptance") {
      return <Tag color="gold">Released</Tag>;
    }
    if (status === "released") {
      return <Tag color="gold">Released</Tag>;
    }
    if (status === "accepted") {
      return <Tag color="blue">Accepted</Tag>;
    }
    if (status === "completed") {
      return <Tag color="green">Completed</Tag>;
    }
    return <Tag>Ongoing</Tag>;
  };

  const columns = [
    {
      title: "Aircraft Type",
      dataIndex: "aircraftType",
      key: "aircraftType",
      width: 140,
    },
    { title: "RP/C", dataIndex: "rpc", key: "rpc", width: 120 },
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
      render: (_, record) => getStatusBadge(record.status),
    },
    {
      title: "Action",
      key: "action",
      width: 280,
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="primary"
            size="small"
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          {isMechanic && record.status === "pending_release" && (
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
          {isMechanic &&
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
        <Col xs={24} sm={12} md={6}>
          <Select
            size="large"
            style={{ width: "100%" }}
            value={selectedAircraft || "all"}
            onChange={(value) =>
              setSelectedAircraft(value === "all" ? "" : value)
            }
            options={aircraftOptions.map((aircraft) => ({
              value: aircraft,
              label: aircraft === "all" ? "All Aircraft" : `RP/C: ${aircraft}`,
            }))}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Select
            size="large"
            style={{ width: "100%" }}
            value={selectedStatus}
            onChange={setSelectedStatus}
            options={statusOptions}
          />
        </Col>
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
        <Col span={24} style={{ textAlign: "right" }}>
          <Text type="secondary">
            Showing <Text strong>{filteredLogs.length}</Text> flight log(s)
          </Text>
        </Col>
      </Row>

      <Card className="fl-table-wrapper" styles={{ body: { padding: 0 } }}>
        <Table
          className="fl-table"
          columns={columns}
          dataSource={filteredLogs}
          loading={loading}
          rowKey={(record) => record._id || record.id}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          locale={{
            emptyText:
              searchQuery || selectedAircraft || selectedStatus !== "all"
                ? "No flight logs found"
                : "No flight logs yet",
          }}
          size="small"
        />
      </Card>

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
        />
      )}

      <Modal
        open={workflowModal.open}
        onCancel={closeWorkflowModal}
        onOk={handleWorkflowAction}
        confirmLoading={saving}
        title={
          workflowModal.action === "release"
            ? "Release Flight Log"
            : workflowModal.action === "accept"
              ? "Accept Flight Log"
              : workflowModal.action === "notify"
                ? "Notify Mechanic"
                : "Complete Flight Log"
        }
      >
        {workflowModal.action === "release" && (
          <p>Release this flight log to pilot acceptance?</p>
        )}
        {workflowModal.action === "accept" && (
          <p>Accept this flight log as pilot?</p>
        )}
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
