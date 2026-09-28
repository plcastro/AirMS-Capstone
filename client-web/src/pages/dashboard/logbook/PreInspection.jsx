import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Button,
  Card,
  Checkbox,
  Col,
  Descriptions,
  Divider,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Tooltip,
  Typography,
  DatePicker,
  Grid,
} from "antd";
import {
  ArrowLeftOutlined,
  ExportOutlined,
  EyeOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { AuthContext } from "../../../context/AuthContext";
import { API_BASE } from "../../../utils/API_BASE";
import ResponsiveTable from "../../../components/common/ResponsiveTable";
import FlightWorkspace from "../../../components/pagecomponents/FlightWorkspace";
import AircraftLogGroups from "../../../components/common/AircraftLogGroups";
import NewLogBadge from "../../../components/common/NewLogBadge";
import useViewedLogs from "../../../utils/useViewedLogs";
import { renderStatusTag } from "../../../utils/statusTags";
import ResultPopup from "../../../components/common/ResultPopup";
import dayjs from "dayjs";
import { useLocation, useNavigate } from "react-router-dom";
import { matchesSearch } from "../../../utils/search";
import { canExportModule } from "../../../../../shared/exportAccess";
import { getLogAircraftRegistration } from "../../../../../shared/aircraftLogGroups";
import PreInspectionB412Checklist from "../../../components/pagecomponents/PreInspectionB412Checklist";
import { isB412Aircraft } from "../../../utils/b412PreInspection";

const { Text } = Typography;
const { useBreakpoint } = Grid;
const STATUS_OPTIONS = ["all", "released", "completed"];
const sanitizeFileName = (value) =>
  String(value || "pre-flight inspection")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-");

export default function PreInspection() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { user, getAuthHeader } = useContext(AuthContext);
  const { isNew, markViewed } = useViewedLogs(user, "pre");
  const canExportPreInspections = canExportModule(
    user?.jobTitle,
    "preInspection",
  );
  const location = useLocation();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [aircraftQuery, setAircraftQuery] = useState("");
  const [selectedAircraft, setSelectedAircraft] = useState(null);
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState(null);
  useEffect(() => {
    if (editing && !editing.flightLogId) markViewed(editing);
  }, [editing, markViewed]);
  const [popup, setPopup] = useState({
    open: false,
    status: "success",
    title: "",
    subTitle: "",
  });

  const getDisplayStatus = (value) =>
    String(value || "").toLowerCase() === "completed"
      ? "completed"
      : String(value || "").toLowerCase() === "released"
        ? "released"
        : "pending";
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/api/pre-flight/getAllPreInspection`,
        { headers: await getAuthHeader() },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.message || "Failed to load pre-flight inspections",
        );
      setRecords(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: error.message || "Failed to load pre-flight inspections",
      });
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const notificationStatus = params.get("notificationStatus");
    if (notificationStatus) {
      setStatus(String(notificationStatus).toLowerCase());
      setSelectedAircraft(null);
      setQuery("");
      setAircraftQuery("");
    }
  }, [location.search]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const targetPreInspectionId = params.get("targetPreInspectionId");
    if (!targetPreInspectionId || !records.length) return;

    const match = records.find(
      (item) => String(item._id) === String(targetPreInspectionId),
    );
    if (!match) return;

    setSelectedAircraft(getLogAircraftRegistration(match));
    setQuery("");
    setStatus("all");
    setEditing(match);
    navigate("/dashboard/pre-flight inspection", { replace: true });
  }, [location.search, navigate, records]);

  const openAircraft = (rpc) => {
    setSelectedAircraft(rpc);
    setQuery("");
    setStatus("all");
  };

  const backToAircraft = () => {
    setSelectedAircraft(null);
    setQuery("");
    setStatus("all");
  };

  const filtered = useMemo(
    () =>
      records.filter((item) => {
        const matchesQuery = matchesSearch(query, item);
        const matchesAircraft =
          getLogAircraftRegistration(item) === selectedAircraft;
        const matchesStatus =
          status === "all" ||
          getDisplayStatus(String(item.status || "").toLowerCase()) === status;
        return matchesQuery && matchesAircraft && matchesStatus;
      }),
    [records, query, selectedAircraft, status],
  );

  const booleanFields = useMemo(
    () =>
      Object.keys(editing || {}).filter(
        (key) => typeof editing?.[key] === "boolean",
      ),
    [editing],
  );
  const exportInspectionPdf = async (record) => {
    if (!record?._id) return;
    try {
      const response = await fetch(
        `${API_BASE}/api/inspections/pre/${record._id}/export-pdf`,
        { headers: await getAuthHeader() },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.message ||
            data.error ||
            "Failed to export pre-flight inspection",
        );
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${sanitizeFileName(
        `Pre-Flight Inspection-${record.rpc || "N-A"}-${record.date || ""}`,
      )}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setPopup({
        open: true,
        status: "success",
        title: "Pre-Flight Inspection Exported!",
        subTitle:
          "The pre-flight inspection PDF has been exported successfully.",
      });
    } catch (error) {
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: error.message || "Failed to export pre-flight inspection",
      });
    }
  };

  return (
    <div className="fl-page">
      {!selectedAircraft ? (
        <>
          <AircraftLogGroups
            isNew={isNew}
            records={records}
            sortBy="latestActivity"
            loading={loading}
            query={aircraftQuery}
            onQueryChange={setAircraftQuery}
            onSelect={openAircraft}
            emptyText="No pre-flight inspections found."
          />
        </>
      ) : (
        <>
          {/* SELECTED AIRCRAFT PAGE */}
          <Row
            gutter={[12, 12]}
            align="middle"
            justify="space-between"
            style={{ marginBottom: 16 }}
          >
            <Col span={24}>
              <Button
                onClick={backToAircraft}
                type="text"
                icon={<ArrowLeftOutlined />}
                style={{
                  marginBottom: 12,
                  paddingInline: 0,
                  color: "#1f5f49",
                }}
              >
                Back to Aircraft
              </Button>

              <Typography.Title level={4} style={{ margin: "8px 0 0" }}>
                {selectedAircraft} — Pre-Flight Inspections
              </Typography.Title>
            </Col>
          </Row>

          <Card>
            <Row gutter={[12, 12]} align="middle" justify="space-between">
              {/* Search */}
              <Col>
                <Space wrap size={[12, 12]}>
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search"
                    prefix={<SearchOutlined />}
                    size="large"
                    style={{ width: "min(320px, calc(100vw - 64px))" }}
                    allowClear
                  />

                  {/* Status Filter */}
                  <Select
                    style={{ width: 180 }}
                    value={status}
                    onChange={setStatus}
                    options={STATUS_OPTIONS.map((value) => ({
                      value,
                      label:
                        value === "all"
                          ? "ALL STATUS"
                          : value === "released"
                            ? "RELEASED"
                            : value.toUpperCase(),
                    }))}
                    size="large"
                  />
                </Space>
              </Col>

            </Row>
          </Card>

          <ResponsiveTable
            key={selectedAircraft}
            style={{ marginTop: 12 }}
            rowKey="_id"
            loading={loading}
            dataSource={filtered}
            pagination={{ pageSize: 10 }}
            size={"small"}
            columns={[
              { title: "RP/C", dataIndex: "rpc", render: (value, record) => <Space wrap>{value}{isNew(record) && <NewLogBadge />}</Space> },
              { title: "Aircraft Type", dataIndex: "aircraftType" },
              { title: "Date", dataIndex: "date" },
              {
                title: "Status",
                dataIndex: "status",
                render: (value) => renderStatusTag(value, "pending"),
              },
              {
                title: "Action",
                render: (_, record) => (
                  <Space size={12}>
                    <Tooltip title="View">
                      <Button
                        aria-label="View"
                        icon={<EyeOutlined />}
                        onClick={() => setEditing(record)}
                      />
                    </Tooltip>

                    {canExportPreInspections && (
                      <Tooltip title="Export">
                        <Button
                          aria-label="Export"
                          icon={<ExportOutlined />}
                          onClick={() => exportInspectionPdf(record)}
                        />
                      </Tooltip>
                    )}
                  </Space>
                ),
              },
            ]}
          />

          <Row gutter={[10, 10]} style={{ marginTop: 8, marginBottom: 16 }}>
            <Col span={24} style={{ textAlign: "right" }}>
              <Text type="secondary">
                Showing <Text strong>{filtered.length}</Text> Log(s)
              </Text>
            </Col>
          </Row>
        </>
      )}

      <Modal
        centered
        zIndex={9999}
        open={Boolean(editing) && !editing?.flightLogId}
        onCancel={() => setEditing(null)}
        title="View Pre-Flight Inspection"
        footer={<Button onClick={() => setEditing(null)}>Close</Button>}
        width={isMobile ? "100%" : 1140}
        destroyOnHidden
        styles={{
          body: {
            maxHeight: "70vh",
            overflowY: "auto",
            paddingTop: 12,
          },
        }}
      >
        {editing && (
          <Space orientation="vertical" style={{ width: "100%" }} size={14}>
            <Text type="secondary">
              Linked Flight Log:{" "}
              {editing.flightLogControlNo ||
                editing.flightLogId ||
                "Not linked"}{" "}
              · Pilot: {editing.assignedPilot?.name || "Not assigned"} ·
              Mechanic: {editing.assignedMechanic?.name || "Not assigned"}
            </Text>

            <Row gutter={[10, 10]}>
              <Col xs={24} md={8}>
                <Text
                  strong
                  style={{
                    display: "block",
                    marginBottom: 6,
                    width: "100%",
                  }}
                >
                  RP/C
                </Text>

                <Select
                  size="large"
                  style={{ width: "100%" }}
                  value={editing.rpc}
                  disabled
                  showSearch={{
                    optionFilterProp: "label",
                  }}
                  options={[editing.rpc].filter(Boolean).map((rpc) => ({
                    value: rpc,
                    label: rpc,
                  }))}
                />
              </Col>

              <Col xs={24} md={8}>
                <Text
                  strong
                  style={{
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Aircraft Type
                </Text>

                <Input
                  size="large"
                  value={editing.aircraftType}
                  disabled
                  readOnly
                />
              </Col>

              <Col xs={24} md={8}>
                <Text
                  strong
                  style={{
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Date
                </Text>

                <DatePicker
                  size="large"
                  style={{ width: "100%" }}
                  format="MM/DD/YYYY"
                  inputReadOnly
                  value={
                    editing.date ? dayjs(editing.date, "MM/DD/YYYY") : null
                  }
                  disabled
                />
              </Col>
            </Row>

            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Status">
                {renderStatusTag(editing.status, "pending")}
              </Descriptions.Item>

              <Descriptions.Item label="Released By">
                {editing.releasedBy?.name || "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Accepted By">
                {editing.acceptedBy?.name || "-"}
              </Descriptions.Item>
            </Descriptions>

            <Row gutter={[10, 10]}>
              <Col xs={24} md={8}>
                <Text
                  strong
                  style={{
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Fuel On Board
                </Text>

                <Input
                  type="number"
                  size="large"
                  value={editing.fob}
                  disabled
                  placeholder="Fuel On Board"
                  suffix="%"
                />
              </Col>
            </Row>

            <Divider style={{ margin: "6px 0" }}>Checklist Points</Divider>

            {isB412Aircraft(editing.aircraftType) ? (
              <PreInspectionB412Checklist
                value={editing.b412Data}
                disabled
              />
            ) : (
              <Row gutter={[8, 8]}>
                {booleanFields.map((field) => (
                  <Col xs={24} md={12} lg={8} key={field}>
                    <Checkbox
                      checked={Boolean(editing[field])}
                      disabled
                    >
                      {field}
                    </Checkbox>
                  </Col>
                ))}
              </Row>
            )}

          </Space>
        )}
      </Modal>

      {!!editing?.flightLogId && (
        <FlightWorkspace
          id={String(editing.flightLogId?._id || editing.flightLogId)}
          open
          initialSection="pre" inspectionMode readOnly
          onViewed={({ preInspections }) => markViewed(preInspections?.find(record => String(record._id) === String(editing._id)))}
          onClose={() => setEditing(null)}
          onChanged={load}
        />
      )}

      <ResultPopup
        open={popup.open}
        zIndex={7000}
        status={popup.status}
        title={popup.title}
        subTitle={popup.subTitle}
        onClose={() =>
          setPopup((prev) => ({
            ...prev,
            open: false,
          }))
        }
      />
    </div>
  );
}
