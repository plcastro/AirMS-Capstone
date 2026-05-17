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
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Tabs,
  Table,
  Tag,
  Typography,
  DatePicker,
  message,
} from "antd";
import {
  ExportOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { AuthContext } from "../../../context/AuthContext";
import { API_BASE } from "../../../utils/API_BASE";
import PinVerifiedSignatureModal from "../../../components/common/PinVerifiedSignatureModal";
import dayjs from "dayjs";

const { Text } = Typography;
const STATUS_OPTIONS = ["all", "pending", "released", "completed"];
const PRE_INSPECTION_TABS = [
  "Basic Information",
  "Station 1 and 2",
  "Station 3 and Sling",
  "Floats and Onboard",
];

const station1Items = [
  {
    key: "station1_transparentPanels",
    title: "Transparent Panels",
    label: "Condition - Cleanliness",
  },
  {
    key: "station1_engineOilCooler",
    title: "Engine oil cooler air inlet",
    label: "Check no obstruction nor debris",
  },
  {
    key: "station1_sideSlipIndicator",
    title: "Side slip indicator",
    label: "Condition",
  },
  { key: "station1_pitotTube", title: "Pitot tube", label: "Cover removed - Condition" },
  { key: "station1_landingLights", title: "Landing lights", label: "Condition" },
];

const station2Items = [
  { key: "station2_frontDoor", title: "Front door", label: "Condition jettison system check" },
  {
    key: "station2_rearDoor",
    title: "Rear door",
    label: "Condition, closed, or opened lock (sliding door)",
  },
  { key: "station2_leftCargoDoorOpen", title: "Left cargo door", label: "Open" },
  { key: "station2_loadsObjects", title: "Loads and objects carried", label: "Secured" },
  { key: "station2_leftCargoDoorClosed", title: "Left cargo door", label: "Closed, locked" },
  {
    key: "station2_fuelTank",
    title: "Fuel tank and system",
    label: "Filler plug closed, Tank sump drained",
  },
  { key: "station1_mgbCowl", title: "MGB cowl", label: "MGB oil level - Cowl locked" },
  { key: "station1_lowerFairings", title: "All lower fairings panels", label: "Locked" },
  {
    key: "station1_landingGear",
    title: "Landing gear and footstep",
    label: "Secure - Visual Check",
  },
  { key: "station1_staticPorts", title: "Static ports", label: "Clear, covers removed" },
  { key: "station1_oatSensor", title: "OAT sensor, antennas", label: "Condition" },
  {
    key: "station1_mainRotor",
    title: "Main rotor head blades",
    label: "Visual inspection, no impact",
  },
  {
    key: "station1_engineAirIntake",
    title: "Engine air intake",
    label: "Clear (water, snow foreign object)",
  },
  { key: "station1_engineCowl", title: "Engine cowl", label: "Locked" },
  { key: "station1_exhaustCover", title: "Exhaust cover", label: "Removed" },
  { key: "station1_rearCargoDoorOpen", title: "Rear cargo door", label: "Opened" },
  { key: "station1_loadsObjects", title: "Loads and object carried", label: "Secured" },
  { key: "station1_elt", title: "ELT", label: "Check ARMED" },
  { key: "station1_rearCargoDoorClosed", title: "Rear cargo door", label: "Closed, locked" },
  { key: "station1_oilDrain", title: "Oil drain", label: "No oil under scupper" },
];

const station3Items = [
  { key: "station3_heatShield", title: "Heat shield on tail drive", label: "Condition, attachment" },
  {
    key: "station3_tailBoom",
    title: "Tail boom, antennas",
    label: "Condition - Fairings fasteners locked",
  },
  { key: "station3_stabilizer", title: "Stabilizer, fin, external lights", label: "General condition" },
  {
    key: "station3_tailRotorGuard",
    title: "Tail rotor guard (if fitted)",
    label: "Condition, attachment",
  },
  { key: "station3_tgbFairing", title: "TGB fairing", label: "Secured, fasteners locked" },
  { key: "station3_tgbOilLevel", title: "TGB oil level", label: "Checked" },
  { key: "station3_tailSkid", title: "Tail skid", label: "Condition, attachment" },
  { key: "station3_flexibleCoupling", title: "Flexible Coupling", label: "Visual Check No Crack" },
];

const slingItems = [
  { key: "sling_sling", title: "Sling", label: "Security - General condition" },
  { key: "sling_cablePins", title: "Cable and Pins", label: "Condition, attachment points" },
];

const floatsItems = [
  { key: "floats_lhRh", title: "LH & RH Floats", label: "Security - General Condition" },
  { key: "floats_cylinder", title: "Cylinder", label: "Pressure & Condition, attachment points" },
  { key: "floats_hoses", title: "Hoses", label: "Condition, attachment points" },
];

const onboardItems = [
  { key: "onboard_firstAid", title: "First Aid Kit", label: "Condition, no expired" },
  { key: "onboard_lifeVest", title: "Life Vest", label: "Condition, cleanliness & no damage" },
  { key: "onboard_lifeRaft", title: "Life-raft", label: "Condition, cleanliness & no damage" },
  { key: "onboard_axl", title: "AXL", label: "Security - General Condition" },
  { key: "onboard_fireExt", title: "Fire Extinguisher", label: "Security - General Condition" },
  { key: "onboard_certAirworthiness", title: "Certificate of Airworthiness", label: "Onboard" },
  { key: "onboard_certRegistration", title: "Certificate of Registration", label: "Onboard" },
  { key: "onboard_radioLicense", title: "Radio License", label: "Onboard" },
  { key: "onboard_flightLogbook", title: "Flight Logbook", label: "Onboard" },
];

const CHECKLIST_GROUPS = [
  { title: "Station 1", items: station1Items },
  { title: "Station 2", items: station2Items },
  { title: "Station 3", items: station3Items },
  { title: "Sling", items: slingItems },
  { title: "Floats", items: floatsItems },
  { title: "Mandatory Onboard", items: onboardItems },
];
const CHECKLIST_KEYS = CHECKLIST_GROUPS.flatMap((group) =>
  group.items.map((item) => item.key),
);

const signaturePayload = (user, signature) => ({
  name:
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
    user?.username ||
    "User",
  id: user?.id || user?._id || "",
  licenseNo: user?.licenseNo || "",
  signature,
  timestamp: new Date().toISOString(),
});

const getDefaultSignature = () => ({
  name: "",
  id: "",
  licenseNo: "",
  signature: "",
  timestamp: "",
});

const getDefaultPreInspectionFormData = (userRole = "") => ({
  aircraftType: "",
  rpc: "",
  date: dayjs().format("MM/DD/YYYY"),
  dateAdded: "",
  createdBy: userRole,
  status: "pending",
  ...Object.fromEntries(CHECKLIST_KEYS.map((key) => [key, false])),
  fob: "",
  releasedBy: getDefaultSignature(),
  acceptedBy: getDefaultSignature(),
});

const areAllInspectionChecksComplete = (record = {}) =>
  CHECKLIST_KEYS.every((key) => record[key] === true);

const getDisplayStatus = (statusValue) =>
  statusValue === "completed"
    ? "completed"
    : statusValue === "released"
      ? "released"
      : "pending";

const sanitizeFileName = (value) =>
  String(value || "N-A")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-");

const formatSignatureDate = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
};

export default function PreInspection() {
  const { user, getAuthHeader } = useContext(AuthContext);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [aircraft, setAircraft] = useState("all");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(getDefaultPreInspectionFormData());
  const [rpcOptions, setRpcOptions] = useState([]);
  const [signatureMode, setSignatureMode] = useState(null);

  const role = user?.jobTitle?.toLowerCase() || "";
  const readOnly = role === "officer-in-charge";
  const canRelease = role === "mechanic" || role === "maintenance manager";
  const canCreate = canRelease;
  const canAccept = role === "pilot";
  const isValidDate = (value) =>
    /^\d{2}\/\d{2}\/\d{4}$/.test(String(value || "")) &&
    dayjs(value, "MM/DD/YYYY").isValid();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/api/pre-inspections/getAllPreInspection`,
        { headers: await getAuthHeader() },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to load pre-inspections");
      setRecords(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      message.error(error.message || "Failed to load pre-inspections");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (creating) {
      setDraft(getDefaultPreInspectionFormData(role));
    }
  }, [creating, role]);

  useEffect(() => {
    const loadRpcOptions = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/parts-monitoring/aircraft-list`,
        );
        const data = await response.json();
        if (response.ok && Array.isArray(data.data)) {
          setRpcOptions(data.data.filter(Boolean));
        }
      } catch {
        setRpcOptions([]);
      }
    };
    loadRpcOptions();
  }, []);

  const aircraftOptions = useMemo(
    () => ["all", ...new Set(records.map((item) => item.rpc).filter(Boolean))],
    [records],
  );
  const rpcDropdownOptions = useMemo(
    () => [
      ...new Set([
        ...(rpcOptions || []),
        ...records.map((item) => item.rpc).filter(Boolean),
      ]),
    ],
    [records, rpcOptions],
  );

  const resolveAircraftTypeByRpc = async (rpc) => {
    if (!rpc) return "";
    try {
      const response = await fetch(`${API_BASE}/api/parts-monitoring/${rpc}`);
      const data = await response.json();
      if (response.ok && data?.data) {
        return data.data.aircraftType || "";
      }
      return "";
    } catch {
      return "";
    }
  };

  const getFlightLogDateValue = (flightLog = {}) => {
    const value = flightLog.date || flightLog.createdAt || flightLog.updatedAt;
    if (!value) return 0;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  };

  const getLatestFlightLogFuelOnBoard = (flightLogs = []) => {
    const sortedLogs = [...flightLogs].sort(
      (left, right) =>
        getFlightLogDateValue(right) - getFlightLogDateValue(left),
    );

    for (const flightLog of sortedLogs) {
      const fuelRows = Array.isArray(flightLog.fuelServicing)
        ? [...flightLog.fuelServicing].reverse()
        : [];
      const fuelRow = fuelRows.find((row) =>
        String(row?.mainTotal || row?.mainRemG || "").trim(),
      );
      const fuelValue = fuelRow?.mainTotal || fuelRow?.mainRemG;
      const numericFuel = Number(String(fuelValue || "").replace(/,/g, ""));

      if (Number.isFinite(numericFuel) && numericFuel > 0) {
        return String(Math.round(Math.min((numericFuel / 200) * 100, 100)));
      }
    }

    return "";
  };

  const resolveFobByRpc = async (rpc, { force = false, target = "draft" } = {}) => {
    if (!rpc) return;
    const currentRecord = target === "editing" ? editing : draft;
    if (!force && String(currentRecord?.fob || "").trim()) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/flightlogs/aircraft/${encodeURIComponent(rpc)}?limit=20`,
      );
      const data = await response.json();
      if (!response.ok) return;

      const fob = getLatestFlightLogFuelOnBoard(
        Array.isArray(data?.data) ? data.data : [],
      );
      if (!fob) return;

      const setter = target === "editing" ? setEditing : setDraft;
      setter((prev) => ({ ...prev, fob }));
    } catch {
      // Keep the field user-editable when the lookup is unavailable.
    }
  };

  const filtered = useMemo(
    () =>
      records.filter((item) => {
        const needle = query.trim().toLowerCase();
        const matchesQuery =
          !needle ||
          [item.rpc, item.aircraftType, item.date].some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(needle),
          );
        const matchesAircraft = aircraft === "all" || item.rpc === aircraft;
        const matchesStatus =
          status === "all" ||
          getDisplayStatus(item.status) === status;
        return matchesQuery && matchesAircraft && matchesStatus;
      }),
    [records, query, aircraft, status],
  );

  const validateBasicFields = (payload) => {
    if (!payload?.rpc?.trim() || !payload?.aircraftType?.trim()) {
      message.warning("RP/C and aircraft type are required");
      return false;
    }
    if (!payload.date || !isValidDate(payload.date)) {
      message.warning("Please select a valid date");
      return false;
    }
    return true;
  };

  const validateBeforeSigning = (payload, actionLabel) => {
    if (!validateBasicFields(payload)) return false;
    if (!String(payload.fob || "").trim()) {
      message.warning(`FOB must be filled in before ${actionLabel}.`);
      return false;
    }
    if (!areAllInspectionChecksComplete(payload)) {
      message.warning(`All checklist fields must be checked before ${actionLabel}.`);
      return false;
    }
    return true;
  };

  const saveCreate = async (signature) => {
    if (!validateBeforeSigning(draft, "release")) return;

    try {
      setCreating(true);
      const releasedBy = signaturePayload(user, signature);
      const response = await fetch(
        `${API_BASE}/api/pre-inspections/createPreInspection`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(await getAuthHeader()),
          },
          body: JSON.stringify({
            ...draft,
            status: "released",
            releasedBy,
            createdBy:
              `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
            confirmAction: true,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to create pre-inspection");
      message.success("Pre-inspection created and released");
      setCreating(false);
      setDraft(getDefaultPreInspectionFormData(role));
      await load();
    } catch (error) {
      setCreating(false);
      message.error(error.message || "Failed to create pre-inspection");
    }
  };

  const saveEdit = async (nextPayload = editing) => {
    if (!nextPayload?._id) return;
    if (!validateBasicFields(nextPayload)) return;
    try {
      const response = await fetch(
        `${API_BASE}/api/pre-inspections/updatePreInspectionById/${nextPayload._id}`,
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
        throw new Error(data.message || "Failed to update pre-inspection");
      setEditing(data.data);
      await load();
      message.success("Pre-inspection updated");
    } catch (error) {
      message.error(error.message || "Failed to update pre-inspection");
    }
  };

  const handleSignedAction = async (signature) => {
    if (signatureMode === "createRelease") {
      await saveCreate(signature);
      setSignatureMode(null);
      return;
    }

    if (!editing) return;
    if (signatureMode === "release") {
      if (!validateBeforeSigning(editing, "release")) return;
      await saveEdit({
        ...editing,
        status: "released",
        releasedBy: signaturePayload(user, signature),
      });
    }
    if (signatureMode === "accept") {
      if (!validateBeforeSigning(editing, "acceptance")) return;
      await saveEdit({
        ...editing,
        status: "completed",
        acceptedBy: signaturePayload(user, signature),
      });
    }
    setSignatureMode(null);
  };

  const updateDraft = (field, value) =>
    setDraft((prev) => ({ ...prev, [field]: value }));

  const updateEditing = (field, value) =>
    setEditing((prev) => ({ ...prev, [field]: value }));

  const handleRpcChange = async (value, target) => {
    const aircraftType = await resolveAircraftTypeByRpc(value);
    const setter = target === "editing" ? setEditing : setDraft;
    setter((prev) => ({
      ...prev,
      rpc: value,
      aircraftType: aircraftType || prev.aircraftType,
    }));
    await resolveFobByRpc(value, { force: true, target });
  };

  const setGroupChecked = (setter, items, checked) => {
    setter((prev) => ({
      ...prev,
      ...Object.fromEntries(items.map((item) => [item.key, checked])),
    }));
  };

  const renderSignatureCard = (title, signature, roleLabel) => {
    if (!signature?.name) return null;

    return (
      <Card
        size="small"
        title={title}
        style={{ marginTop: 12 }}
        styles={{ header: { background: "#1677ff", color: "#fff" } }}
      >
        <Space direction="vertical" size={6}>
          <Text strong>
            {signature.name} {signature.id ? `/ ${signature.id}` : ""}
          </Text>
          <Text type="secondary">{roleLabel}</Text>
          <Text type="secondary">{formatSignatureDate(signature.timestamp)}</Text>
          {!!signature.signature && (
            <img
              src={signature.signature}
              alt={`${title} signature`}
              style={{ maxWidth: 360, width: "100%", height: 80, objectFit: "contain" }}
            />
          )}
        </Space>
      </Card>
    );
  };

  const renderChecklistGroup = (group, record, updateRecord, setRecord, isEditable) => {
    const allChecked = group.items.every((item) => Boolean(record?.[item.key]));

    return (
      <Card
        key={group.title}
        size="small"
        title={group.title}
        extra={
          isEditable ? (
            <Checkbox
              checked={allChecked}
              onChange={(e) =>
                setGroupChecked(setRecord, group.items, e.target.checked)
              }
            >
              Select All
            </Checkbox>
          ) : null
        }
        style={{ marginBottom: 12 }}
      >
        <Row gutter={[12, 12]}>
          {group.items.map((item, index) => (
            <Col xs={24} md={12} lg={8} key={item.key}>
              <Checkbox
                checked={Boolean(record?.[item.key])}
                disabled={!isEditable}
                onChange={(e) => updateRecord(item.key, e.target.checked)}
              >
                <Text strong>{index + 1}. {item.title}</Text>
                <br />
                <Text type="secondary">{item.label}</Text>
              </Checkbox>
            </Col>
          ))}
        </Row>
      </Card>
    );
  };

  const renderBasicInformation = (record, target, editable) => (
    <Card
      title="Rotary Winged Aircraft - Single Engine"
      size="small"
      styles={{ header: { background: "#1677ff", color: "#fff" } }}
    >
      <Row gutter={[12, 12]}>
        <Col xs={24} md={8}>
          <Select
            size="large"
            value={record.rpc || undefined}
            onChange={(value) => handleRpcChange(value, target)}
            placeholder="Select RP/C"
            showSearch
            optionFilterProp="label"
            disabled={!editable}
            style={{ width: "100%" }}
            options={rpcDropdownOptions.map((rpc) => ({
              value: rpc,
              label: rpc,
            }))}
          />
        </Col>
        <Col xs={24} md={8}>
          <Input
            size="large"
            value={record.aircraftType}
            placeholder="Auto-filled from RP/C"
            disabled
          />
        </Col>
        <Col xs={24} md={8}>
          <DatePicker
            size="large"
            style={{ width: "100%" }}
            format="MM/DD/YYYY"
            value={record.date ? dayjs(record.date, "MM/DD/YYYY") : null}
            disabled
          />
        </Col>
      </Row>
    </Card>
  );

  const renderPreInspectionTabs = (record, target, isEditable) => {
    const updateRecord = target === "editing" ? updateEditing : updateDraft;
    const setRecord = target === "editing" ? setEditing : setDraft;
    return (
      <Tabs
        items={PRE_INSPECTION_TABS.map((tab) => ({
          key: tab,
          label: tab,
          children:
            tab === "Basic Information" ? (
              renderBasicInformation(record, target, target !== "editing" && isEditable)
            ) : tab === "Station 1 and 2" ? (
              [CHECKLIST_GROUPS[0], CHECKLIST_GROUPS[1]].map((group) =>
                renderChecklistGroup(group, record, updateRecord, setRecord, isEditable),
              )
            ) : tab === "Station 3 and Sling" ? (
              [CHECKLIST_GROUPS[2], CHECKLIST_GROUPS[3]].map((group) =>
                renderChecklistGroup(group, record, updateRecord, setRecord, isEditable),
              )
            ) : (
              <>
                {[CHECKLIST_GROUPS[4], CHECKLIST_GROUPS[5]].map((group) =>
                  renderChecklistGroup(group, record, updateRecord, setRecord, isEditable),
                )}
                <Card
                  size="small"
                  title="Fuel On Board"
                  styles={{ header: { background: "#1677ff", color: "#fff" } }}
                >
                  <InputNumber
                    min={0}
                    max={100}
                    value={record.fob === "" ? null : Number(record.fob)}
                    onChange={(value) => updateRecord("fob", value === null ? "" : String(value))}
                    disabled={!isEditable}
                    addonAfter="%"
                    style={{ width: 220 }}
                  />
                </Card>
              </>
            ),
        }))}
      />
    );
  };

  const downloadInspectionDocument = async (record, format) => {
    if (!record?._id) {
      message.error("Invalid inspection data");
      return;
    }

    const exportPath = format === "pdf" ? "export-pdf" : "export-document";
    const extension = format === "pdf" ? "pdf" : "docx";
    const fileName = sanitizeFileName(
      `Pre-Inspection-${record.rpc || "N-A"}-${record.date || dayjs().format("MM-DD-YYYY")}.${extension}`,
    );

    try {
      const response = await fetch(
        `${API_BASE}/api/inspections/pre/${record._id}/${exportPath}`,
        { headers: await getAuthHeader() },
      );
      if (!response.ok) {
        throw new Error("Failed to download document from server");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      message.success(`${format === "pdf" ? "PDF" : "Word"} export downloaded`);
    } catch (error) {
      message.error(error.message || "Unable to generate and download document");
    }
  };

  const isEditingFormEditable = false;
  const showReleaseButton =
    canRelease &&
    editing?.status === "pending" &&
    !editing?.releasedBy?.name;
  const showAcceptButton =
    canAccept &&
    editing?.status === "released" &&
    !editing?.acceptedBy?.name;

  return (
    <div style={{ padding: 20 }}>
      <Card>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={8}>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              style={{ width: "100%" }}
              value={aircraft}
              onChange={setAircraft}
              options={aircraftOptions.map((value) => ({
                value,
                label: value === "all" ? "All Aircraft" : `RP/C: ${value}`,
              }))}
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              style={{ width: "100%" }}
              value={status}
              onChange={setStatus}
              options={STATUS_OPTIONS.map((value) => ({
                value,
                label: value === "all" ? "All Status" : value,
              }))}
            />
          </Col>
          {canCreate && (
            <Col xs={24} md={4}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreating(true)}
              >
                New Entry
              </Button>
            </Col>
          )}
        </Row>
      </Card>

      <Table
        style={{ marginTop: 12 }}
        rowKey="_id"
        loading={loading}
        dataSource={filtered}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: "RP/C", dataIndex: "rpc" },
          { title: "Aircraft Type", dataIndex: "aircraftType" },
          { title: "Date", dataIndex: "date" },
          {
            title: "Status",
            dataIndex: "status",
            render: (value) => (
              <Tag>{String(value || "pending").toUpperCase()}</Tag>
            ),
          },
          {
            title: "Action",
            render: (_, record) => (
              <Space>
                <Button
                  icon={<EyeOutlined />}
                  onClick={() =>
                    setEditing({
                      ...getDefaultPreInspectionFormData(role),
                      ...record,
                    })
                  }
                >
                  View
                </Button>
                <Button
                  type="text"
                  size="small"
                  icon={<ExportOutlined />}
                  onClick={() => downloadInspectionDocument(record, "pdf")}
                />
              </Space>
            ),
          },
        ]}
      />

      <Modal
        open={creating}
        onCancel={() => setCreating(false)}
        onOk={() => {
          if (validateBeforeSigning(draft, "release")) {
            setSignatureMode("createRelease");
          }
        }}
        title="New Entry - Pre-Inspection"
        okText="Release"
        width={1140}
      >
        {renderPreInspectionTabs(draft, "draft", true)}
      </Modal>

      <Modal
        open={Boolean(editing)}
        onCancel={() => setEditing(null)}
        footer={[
          <Button key="close" onClick={() => setEditing(null)}>
            Close
          </Button>,
          showReleaseButton ? (
            <Button
              key="release"
              type="primary"
              onClick={() => {
                if (validateBeforeSigning(editing, "release")) {
                  setSignatureMode("release");
                }
              }}
            >
              Release
            </Button>
          ) : null,
          showAcceptButton ? (
            <Button
              key="accept"
              type="primary"
              onClick={() => {
                if (validateBeforeSigning(editing, "acceptance")) {
                  setSignatureMode("accept");
                }
              }}
            >
              Accept
            </Button>
          ) : null,
        ].filter(Boolean)}
        title="View Pre-Inspection"
        width={1140}
      >
        {editing && (
          <Space orientation="vertical" style={{ width: "100%" }} size={14}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Status">
                {editing.status}
              </Descriptions.Item>
              <Descriptions.Item label="Released By">
                {editing.releasedBy?.name || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Accepted By">
                {editing.acceptedBy?.name || "-"}
              </Descriptions.Item>
            </Descriptions>

            {renderPreInspectionTabs(editing, "editing", isEditingFormEditable)}
            {renderSignatureCard("Released By", editing.releasedBy, "MECHANIC")}
            {renderSignatureCard("Accepted By", editing.acceptedBy, "PILOT")}
          </Space>
        )}
      </Modal>

      <PinVerifiedSignatureModal
        open={Boolean(signatureMode)}
        title={
          signatureMode === "release" || signatureMode === "createRelease"
            ? "Release Pre-Inspection"
            : "Accept Pre-Inspection"
        }
        description={
          signatureMode === "release" || signatureMode === "createRelease"
            ? "Draw your release signature."
            : "Draw your acceptance signature."
        }
        confirmDescription="Enter your 6-digit PIN to confirm this signature."
        onCancel={() => setSignatureMode(null)}
        onSave={handleSignedAction}
      />
    </div>
  );
}
