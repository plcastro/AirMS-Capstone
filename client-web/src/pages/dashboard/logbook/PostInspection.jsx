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
  Input,
  Modal,
  Row,
  Select,
  Space,
  Tabs,
  Tooltip,
  Typography,
  Grid,
  DatePicker,
} from "antd";
import {
  EditOutlined,
  ExportOutlined,
  EyeOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { AuthContext } from "../../../context/AuthContext";
import { API_BASE } from "../../../utils/API_BASE";
import { renderStatusTag } from "../../../utils/statusTags";
import ResultPopup from "../../../components/common/ResultPopup";
import PinVerifiedSignatureModal from "../../../components/common/PinVerifiedSignatureModal";
import ResponsiveTable from "../../../components/common/ResponsiveTable";
import { useLocation, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { matchesSearch } from "../../../utils/search";
import { canExportModule } from "../../../../../shared/exportAccess";

const STATUS_OPTIONS = ["all", "pending", "released", "completed"];
const { Text } = Typography;
const { useBreakpoint } = Grid;
const formatDate = (value) => (value ? dayjs(value).format("MM/DD/YYYY") : "");
const sanitizeFileName = (value) =>
  String(value || "post-flight inspection")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-");

const POST_TABS = [
  { key: "basic", label: "Basic Information" },
  { key: "station1", label: "Station 1" },
  { key: "station2", label: "Station 2" },
  { key: "engine", label: "Engine" },
  { key: "mainRotor", label: "Main Rotor" },
  { key: "cabin", label: "Cabin Interior" },
  { key: "notes", label: "Notes" },
];

const signaturePayload = (user, signature) => {
  const licenseNo =
    user?.licenseNo || user?.licenseNumber || user?.license || "";
  return {
    name:
      `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
      user?.username ||
      "User",
    id: licenseNo,
    licenseNo,
    userId: user?.id || user?._id || "",
    signature,
    timestamp: new Date().toISOString(),
  };
};

export default function PostInspection() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { user, getAuthHeader } = useContext(AuthContext);
  const canExportPostInspections = canExportModule(
    user?.jobTitle,
    "postInspection",
  );
  const location = useLocation();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [aircraft, setAircraft] = useState("all");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState(null);
  const [signatureMode, setSignatureMode] = useState(null);
  const [editTab, setEditTab] = useState("basic");
  const [popup, setPopup] = useState({
    open: false,
    status: "success",
    title: "",
    subTitle: "",
  });

  const role = user?.jobTitle?.toLowerCase() || "";
  const readOnly = role === "officer-in-charge";
  const canRelease = ["mechanic", "maintenance manager", "superadmin"].includes(
    role,
  );
  const getDisplayStatus = (value) =>
    value === "completed"
      ? "completed"
      : value === "released"
        ? "released"
        : "pending";

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/api/post-flight/getAllPostInspection`,
        { headers: await getAuthHeader() },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.message || "Failed to load post-flight inspections",
        );
      setRecords(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: error.message || "Failed to load post-flight inspections",
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
      setAircraft("all");
    }
  }, [location.search]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const targetPostInspectionId = params.get("targetPostInspectionId");
    if (!targetPostInspectionId || !records.length) return;

    const match = records.find(
      (item) => String(item._id) === String(targetPostInspectionId),
    );
    if (!match) return;

    setEditing(match);
    navigate("/dashboard/post-flight inspection", { replace: true });
  }, [location.search, navigate, records]);

  const aircraftOptions = useMemo(
    () => ["all", ...new Set(records.map((item) => item.rpc).filter(Boolean))],
    [records],
  );

  const filtered = useMemo(
    () =>
      records.filter((item) => {
        const matchesQuery = matchesSearch(query, item);
        const matchesAircraft = aircraft === "all" || item.rpc === aircraft;
        const matchesStatus =
          status === "all" ||
          getDisplayStatus(String(item.status || "").toLowerCase()) === status;
        return matchesQuery && matchesAircraft && matchesStatus;
      }),
    [records, query, aircraft, status],
  );

  const booleanFields = useMemo(
    () =>
      Object.keys(editing || {}).filter(
        (key) => typeof editing?.[key] === "boolean",
      ),
    [editing],
  );

  const groupedBooleanFields = useMemo(() => {
    const byPrefix = (prefix) =>
      booleanFields.filter((field) => field.startsWith(prefix));

    const station1 = byPrefix("station1_");
    const station2 = byPrefix("station2_");
    const engine = booleanFields.filter(
      (field) =>
        field.startsWith("station3_") ||
        field.startsWith("engine_") ||
        field.includes("gimbal") ||
        field.includes("hydraulic"),
    );
    const mainRotor = booleanFields.filter(
      (field) =>
        field.startsWith("mainRotor_") ||
        field.includes("rotor") ||
        field.includes("swash") ||
        field.includes("pitchChange"),
    );
    const cabin = booleanFields.filter(
      (field) =>
        field.startsWith("cabin_") ||
        field.startsWith("interior_") ||
        field.includes("seat") ||
        field.includes("harness"),
    );

    const used = new Set([
      ...station1,
      ...station2,
      ...engine,
      ...mainRotor,
      ...cabin,
    ]);
    const others = booleanFields.filter((field) => !used.has(field));

    return {
      station1,
      station2,
      engine,
      mainRotor,
      cabin: [...cabin, ...others],
    };
  }, [booleanFields]);

  const formatFieldLabel = (field = "") =>
    String(field)
      .replace(/^station\d+_/, "")
      .replace(/^mainRotor_/, "")
      .replace(/^cabin_/, "")
      .replace(/^interior_/, "")
      .replace(/^engine_/, "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const saveEdit = async (nextPayload = editing) => {
    if (!nextPayload?._id) return;
    try {
      const response = await fetch(
        `${API_BASE}/api/post-flight/updatePostInspectionById/${nextPayload._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(await getAuthHeader()),
          },
          body: JSON.stringify({ ...nextPayload, confirmAction: true }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.message || "Failed to update post-flight inspection",
        );
      setEditing(data.data);
      await load();
      setPopup({
        open: true,
        status: "success",
        title: "Post-Flight Inspection Updated!",
        subTitle: "The post-flight inspection has been updated successfully.",
      });
    } catch (error) {
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: error.message || "Failed to update post-flight inspection",
      });
    }
  };

  const exportInspectionPdf = async (record) => {
    if (!record?._id) return;
    try {
      const response = await fetch(
        `${API_BASE}/api/inspections/post/${record._id}/export-pdf`,
        { headers: await getAuthHeader() },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.message ||
            data.error ||
            "Failed to export post-flight inspection",
        );
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${sanitizeFileName(
        `Post-Flight Inspection-${record.rpc || "N-A"}-${record.date || ""}`,
      )}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setPopup({
        open: true,
        status: "success",
        title: "Post-Flight Inspection Exported!",
        subTitle:
          "The post-flight inspection PDF has been exported successfully.",
      });
    } catch (error) {
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: error.message || "Failed to export post-flight inspection",
      });
    }
  };

  const handleSignedAction = async (signature) => {
    if (!editing) return;
    await saveEdit({
      ...editing,
      status: "completed",
      releasedBy: signaturePayload(user, signature),
    });
    setSignatureMode(null);
  };

  return (
    <div style={{ padding: isMobile ? 12 : 20 }}>
      <Card>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={9}>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              prefix={<SearchOutlined />}
              size="large"
            />
          </Col>
          <Col xs={12} md={7}>
            <Select
              style={{ width: "100%" }}
              value={aircraft}
              onChange={setAircraft}
              options={aircraftOptions.map((value) => ({
                value,
                label: value === "all" ? "All Aircraft" : `RP/C: ${value}`,
              }))}
              size="large"
            />
          </Col>
          <Col xs={12} md={6}>
            <Select
              style={{ width: "100%" }}
              value={status}
              onChange={setStatus}
              options={STATUS_OPTIONS.map((value) => ({
                value,
                label: value === "all" ? "All Status" : value,
              }))}
              size="large"
            />
          </Col>
        </Row>
      </Card>

      <ResponsiveTable
        style={{ marginTop: 12 }}
        rowKey="_id"
        loading={loading}
        dataSource={filtered}
        pagination={{ pageSize: 10 }}
        size={"small"}
        columns={[
          { title: "RP/C", dataIndex: "rpc" },
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
                <Tooltip title={readOnly ? "View" : "Edit"}>
                  <Button
                    aria-label={readOnly ? "View" : "Edit"}
                    icon={readOnly ? <EyeOutlined /> : <EditOutlined />}
                    onClick={() => setEditing(record)}
                  />
                </Tooltip>
                {canExportPostInspections && (
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
            Showing <Text strong>{filtered.length}</Text> post-flight inspection
            log(s)
          </Text>
        </Col>
      </Row>

      <Modal
        open={Boolean(editing)}
        onCancel={() => setEditing(null)}
        onOk={() => saveEdit()}
        okButtonProps={{ disabled: readOnly }}
        title={
          readOnly
            ? "View Entry - Post-Flight Inspection"
            : "Edit Entry - Post-Flight Inspection"
        }
        okText="Save"
        width={isMobile ? "100%" : 1100}
        destroyOnHidden
        styles={{
          body: { maxHeight: "70vh", overflowY: "auto", paddingTop: 12 },
        }}
      >
        {editing && (
          <Space orientation="vertical" style={{ width: "100%" }} size={14}>
            <Tabs
              activeKey={editTab}
              onChange={setEditTab}
              items={POST_TABS.map((tab) => {
                if (tab.key === "basic") {
                  return {
                    key: tab.key,
                    label: tab.label,
                    children: (
                      <Row gutter={[10, 10]}>
                        <Col xs={24} md={8}>
                          <Text strong>RP/C</Text>
                          <Input
                            value={editing.rpc}
                            onChange={(e) =>
                              setEditing((prev) => ({
                                ...prev,
                                rpc: e.target.value,
                              }))
                            }
                            disabled={readOnly}
                          />
                        </Col>
                        <Col xs={24} md={8}>
                          <Text strong>Aircraft Type</Text>
                          <Input
                            value={editing.aircraftType}
                            onChange={(e) =>
                              setEditing((prev) => ({
                                ...prev,
                                aircraftType: e.target.value,
                              }))
                            }
                            disabled={readOnly}
                          />
                        </Col>
                        <Col xs={24} md={8}>
                          <Text strong>Date</Text>
                          <DatePicker
                            size="middle"
                            style={{ width: "100%" }}
                            format="MM/DD/YYYY"
                            value={
                              editing.date
                                ? dayjs(editing.date, "MM/DD/YYYY")
                                : null
                            }
                            onChange={(date) =>
                              setEditing((prev) => ({
                                ...prev,
                                date: date ? formatDate(date) : "",
                              }))
                            }
                            disabled={readOnly}
                          />
                        </Col>
                      </Row>
                    ),
                  };
                }

                if (tab.key === "notes") {
                  return {
                    key: tab.key,
                    label: tab.label,
                    children: (
                      <Input.TextArea
                        rows={4}
                        placeholder="Enter post-flight inspection notes, discrepancy signals, or remarks"
                        value={editing.notes || ""}
                        onChange={(e) =>
                          setEditing((prev) => ({
                            ...prev,
                            notes: e.target.value,
                          }))
                        }
                        disabled={readOnly}
                      />
                    ),
                  };
                }

                const keyMap = {
                  station1: groupedBooleanFields.station1,
                  station2: groupedBooleanFields.station2,
                  engine: groupedBooleanFields.engine,
                  mainRotor: groupedBooleanFields.mainRotor,
                  cabin: groupedBooleanFields.cabin,
                };
                const fields = keyMap[tab.key] || [];
                return {
                  key: tab.key,
                  label: tab.label,
                  children: (
                    <Row gutter={[8, 8]}>
                      {fields.length ? (
                        fields.map((field) => (
                          <Col xs={24} md={12} lg={8} key={field}>
                            <Checkbox
                              checked={Boolean(editing[field])}
                              disabled={readOnly}
                              onChange={(e) =>
                                setEditing((prev) => ({
                                  ...prev,
                                  [field]: e.target.checked,
                                }))
                              }
                            >
                              {formatFieldLabel(field)}
                            </Checkbox>
                          </Col>
                        ))
                      ) : (
                        <Col span={24}>
                          <Text type="secondary">
                            No checklist items in this section.
                          </Text>
                        </Col>
                      )}
                    </Row>
                  ),
                };
              })}
            />

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

            <Space style={{ justifyContent: "flex-end", width: "100%" }}>
              {canRelease &&
                editing.status === "pending" &&
                !editing.releasedBy?.name && (
                  <Button
                    type="primary"
                    onClick={() => setSignatureMode("complete")}
                  >
                    Release
                  </Button>
                )}
            </Space>
          </Space>
        )}
      </Modal>

      <PinVerifiedSignatureModal
        open={Boolean(signatureMode)}
        title="Complete Post-Flight Inspection"
        description="Draw your completion signature."
        confirmDescription="Enter your 6-digit PIN to confirm completion."
        onCancel={() => setSignatureMode(null)}
        onSave={handleSignedAction}
      />
      <ResultPopup
        open={popup.open}
        status={popup.status}
        title={popup.title}
        subTitle={popup.subTitle}
        onClose={() => setPopup((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
