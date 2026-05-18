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
  Table,
  Tag,
  Tabs,
  Typography,
  DatePicker,
  message,
} from "antd";
import { EditOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { AuthContext } from "../../../context/AuthContext";
import { API_BASE } from "../../../utils/API_BASE";
import PinVerifiedSignatureModal from "../../../components/common/PinVerifiedSignatureModal";
import dayjs from "dayjs";
import { useLocation, useNavigate } from "react-router-dom";

const { Text } = Typography;
const STATUS_OPTIONS = ["all", "pending", "released", "completed"];
const formatDate = (value) => (value ? dayjs(value).format("MM/DD/YYYY") : "");
const isValidDate = (value) =>
  /^\d{2}\/\d{2}\/\d{4}$/.test(String(value || "")) &&
  dayjs(value, "MM/DD/YYYY").isValid();

const getDefaultPreInspectionDraft = (user = null) => ({
  aircraftType: "",
  rpc: "",
  date: formatDate(new Date()),
  dateAdded: "",
  createdBy:
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
    user?.username ||
    "",
  status: "pending",
  station1_transparentPanels: false,
  station1_engineOilCooler: false,
  station1_sideSlipIndicator: false,
  station1_pitotTube: false,
  station1_landingLights: false,
  station1_mgbCowl: false,
  station1_lowerFairings: false,
  station1_landingGear: false,
  station1_staticPorts: false,
  station1_oatSensor: false,
  station1_mainRotor: false,
  station1_engineAirIntake: false,
  station1_engineCowl: false,
  station1_exhaustCover: false,
  station1_rearCargoDoorOpen: false,
  station1_loadsObjects: false,
  station1_elt: false,
  station1_rearCargoDoorClosed: false,
  station1_oilDrain: false,
  station2_frontDoor: false,
  station2_rearDoor: false,
  station2_leftCargoDoorOpen: false,
  station2_loadsObjects: false,
  station2_leftCargoDoorClosed: false,
  station2_fuelTank: false,
  station3_heatShield: false,
  station3_tailBoom: false,
  station3_stabilizer: false,
  station3_tailRotorGuard: false,
  station3_tgbFairing: false,
  station3_tgbOilLevel: false,
  station3_tailSkid: false,
  station3_flexibleCoupling: false,
  sling_sling: false,
  sling_cablePins: false,
  floats_lhRh: false,
  floats_cylinder: false,
  floats_hoses: false,
  onboard_firstAid: false,
  onboard_lifeVest: false,
  onboard_lifeRaft: false,
  onboard_axl: false,
  onboard_fireExt: false,
  onboard_certAirworthiness: false,
  onboard_certRegistration: false,
  onboard_radioLicense: false,
  onboard_flightLogbook: false,
  fob: "",
  releasedBy: { name: "", id: "", signature: "", timestamp: "" },
  acceptedBy: { name: "", id: "", signature: "", timestamp: "" },
});

const CREATE_FORM_SECTIONS = [
  {
    key: "basic",
    label: "Basic Information",
    fields: [],
  },
  {
    key: "station12",
    label: "Station 1 and 2",
    fields: [
      "station1_transparentPanels",
      "station1_engineOilCooler",
      "station1_sideSlipIndicator",
      "station1_pitotTube",
      "station1_landingLights",
      "station1_mgbCowl",
      "station1_lowerFairings",
      "station1_landingGear",
      "station1_staticPorts",
      "station1_oatSensor",
      "station1_mainRotor",
      "station1_engineAirIntake",
      "station1_engineCowl",
      "station1_exhaustCover",
      "station1_rearCargoDoorOpen",
      "station1_loadsObjects",
      "station1_elt",
      "station1_rearCargoDoorClosed",
      "station1_oilDrain",
      "station2_frontDoor",
      "station2_rearDoor",
      "station2_leftCargoDoorOpen",
      "station2_loadsObjects",
      "station2_leftCargoDoorClosed",
      "station2_fuelTank",
    ],
  },
  {
    key: "station3sling",
    label: "Station 3 and Sling",
    fields: [
      "station3_heatShield",
      "station3_tailBoom",
      "station3_stabilizer",
      "station3_tailRotorGuard",
      "station3_tgbFairing",
      "station3_tgbOilLevel",
      "station3_tailSkid",
      "station3_flexibleCoupling",
      "sling_sling",
      "sling_cablePins",
    ],
  },
  {
    key: "floats",
    label: "Floats and Onboard",
    fields: [
      "floats_lhRh",
      "floats_cylinder",
      "floats_hoses",
      "onboard_firstAid",
      "onboard_lifeVest",
      "onboard_lifeRaft",
      "onboard_axl",
      "onboard_fireExt",
      "onboard_certAirworthiness",
      "onboard_certRegistration",
      "onboard_radioLicense",
      "onboard_flightLogbook",
    ],
  },
];

const toFieldLabel = (field) =>
  String(field || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const signaturePayload = (user, signature) => ({
  name:
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
    user?.username ||
    "User",
  id: user?.id || user?._id || "",
  signature,
  timestamp: new Date().toISOString(),
});

export default function PreInspection() {
  const { user, getAuthHeader } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [aircraft, setAircraft] = useState("all");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(() => getDefaultPreInspectionDraft(user));
  const [rpcOptions, setRpcOptions] = useState([]);
  const [signatureMode, setSignatureMode] = useState(null);

  const role = user?.jobTitle?.toLowerCase() || "";
  const readOnly = role === "officer-in-charge";
  const canCreate = role !== "pilot" && !readOnly;
  const canRelease = ["mechanic", "maintenance manager", "admin"].includes(
    role,
  );
  const canAccept = role === "pilot";
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
    const targetPreInspectionId = params.get("targetPreInspectionId");
    if (!targetPreInspectionId || !records.length) return;

    const match = records.find(
      (item) => String(item._id) === String(targetPreInspectionId),
    );
    if (!match) return;

    setEditing(match);
    navigate("/dashboard/pre-inspection", { replace: true });
  }, [location.search, navigate, records]);

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

  const saveCreate = async () => {
    if (!draft.rpc?.trim() || !draft.aircraftType?.trim() || !draft.date) {
      message.warning("RP/C, aircraft type, and date are required");
      return;
    }
    if (!isValidDate(draft.date)) {
      message.warning("Please select a valid date");
      return;
    }

    try {
      setCreating(true);
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
            status: "pending",
            createdBy:
              `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
            confirmAction: true,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to create pre-inspection");
      message.success("Pre-inspection created");
      setCreating(false);
      setDraft(getDefaultPreInspectionDraft(user));
      await load();
    } catch (error) {
      setCreating(false);
      message.error(error.message || "Failed to create pre-inspection");
    }
  };

  const saveEdit = async (nextPayload = editing) => {
    if (!nextPayload?._id) return;
    if (!nextPayload.rpc?.trim() || !nextPayload.aircraftType?.trim()) {
      message.warning("RP/C and aircraft type are required");
      return;
    }
    if (!nextPayload.date || !isValidDate(nextPayload.date)) {
      message.warning("Please select a valid date");
      return;
    }
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
    if (!editing) return;
    if (signatureMode === "release") {
      await saveEdit({
        ...editing,
        status: "released",
        releasedBy: signaturePayload(user, signature),
      });
    }
    if (signatureMode === "accept") {
      await saveEdit({
        ...editing,
        status: "completed",
        acceptedBy: signaturePayload(user, signature),
      });
    }
    setSignatureMode(null);
  };

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
              size="large"
            />
          </Col>
          <Col xs={24} md={4}>
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
          <Col xs={24} md={4}>
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
          {canCreate && (
            <Col xs={24} md={4}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreating(true)}
                size="large"
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
              <Button
                icon={<EditOutlined />}
                onClick={() => setEditing(record)}
              >
                {readOnly ? "View" : "Edit"}
              </Button>
            ),
          },
        ]}
      />

      <Modal
        open={creating}
        onCancel={() => {
          setCreating(false);
          setDraft(getDefaultPreInspectionDraft(user));
        }}
        onOk={saveCreate}
        title="Create Pre-Inspection"
        okText="Create"
        width={1140}
      >
        <Tabs
          items={CREATE_FORM_SECTIONS.map((section) => ({
            key: section.key,
            label: section.label,
            children: (
              <Space orientation="vertical" style={{ width: "100%" }} size={12}>
                {section.key === "basic" ? (
                  <Row gutter={[12, 12]}>
                    <Col xs={24}>
                      <Select
                        size="large"
                        value={draft.rpc}
                        onChange={async (value) => {
                          const aircraftType =
                            await resolveAircraftTypeByRpc(value);
                          setDraft((prev) => ({
                            ...prev,
                            rpc: value,
                            aircraftType: aircraftType || prev.aircraftType,
                          }));
                        }}
                        placeholder="Select RP/C"
                        showSearch
                        filterOption={(input, option) =>
                          (option?.label ?? "")
                            .toLowerCase()
                            .includes(input.toLowerCase())
                        }
                        options={rpcDropdownOptions.map((rpc) => ({
                          value: rpc,
                          label: rpc,
                        }))}
                      />
                    </Col>
                    <Col xs={24} md={12}>
                      <Input
                        size="large"
                        value={draft.aircraftType}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            aircraftType: e.target.value,
                          }))
                        }
                        placeholder="Aircraft Type"
                      />
                    </Col>
                    <Col xs={24} md={12}>
                      <DatePicker
                        size="large"
                        style={{ width: "100%" }}
                        format="MM/DD/YYYY"
                        value={
                          draft.date ? dayjs(draft.date, "MM/DD/YYYY") : null
                        }
                        onChange={(date) =>
                          setDraft((prev) => ({
                            ...prev,
                            date: date ? formatDate(date) : "",
                          }))
                        }
                      />
                    </Col>
                    <Col xs={24}>
                      <Input
                        size="large"
                        value={draft.fob}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            fob: e.target.value,
                          }))
                        }
                        placeholder="FOB"
                      />
                    </Col>
                  </Row>
                ) : (
                  <Row gutter={[8, 8]}>
                    {section.fields.map((field) => (
                      <Col xs={24} md={12} lg={8} key={field}>
                        <Checkbox
                          checked={Boolean(draft[field])}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              [field]: e.target.checked,
                            }))
                          }
                        >
                          {toFieldLabel(field)}
                        </Checkbox>
                      </Col>
                    ))}
                  </Row>
                )}
              </Space>
            ),
          }))}
        />
      </Modal>

      <Modal
        open={Boolean(editing)}
        onCancel={() => setEditing(null)}
        onOk={() => saveEdit()}
        okButtonProps={{ disabled: readOnly }}
        title={readOnly ? "View Pre-Inspection" : "Edit Pre-Inspection"}
        okText="Save"
        width={1140}
      >
        {editing && (
          <Space orientation="vertical" style={{ width: "100%" }} size={14}>
            <Row gutter={[10, 10]}>
              <Col span={8}>
                <Select
                  size="large"
                  value={editing.rpc}
                  onChange={async (value) => {
                    const aircraftType = await resolveAircraftTypeByRpc(value);
                    setEditing((prev) => ({
                      ...prev,
                      rpc: value,
                      aircraftType: aircraftType || prev.aircraftType,
                    }));
                  }}
                  showSearch
                  optionFilterProp="label"
                  options={rpcDropdownOptions.map((rpc) => ({
                    value: rpc,
                    label: rpc,
                  }))}
                  disabled={readOnly}
                />
              </Col>
              <Col span={8}>
                <Input
                  size="large"
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
              <Col span={8}>
                <DatePicker
                  size="large"
                  style={{ width: "100%" }}
                  format="MM/DD/YYYY"
                  value={
                    editing.date ? dayjs(editing.date, "MM/DD/YYYY") : null
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

            <Divider style={{ margin: "6px 0" }}>Checklist Points</Divider>
            <Row gutter={[8, 8]}>
              {booleanFields.map((field) => (
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
                    {field}
                  </Checkbox>
                </Col>
              ))}
            </Row>

            <Space style={{ justifyContent: "flex-end", width: "100%" }}>
              {canRelease &&
                editing.status === "pending" &&
                !editing.releasedBy?.name && (
                  <Button
                    type="primary"
                    onClick={() => setSignatureMode("release")}
                  >
                    Release
                  </Button>
                )}
              {canAccept &&
                editing.status === "released" &&
                !editing.acceptedBy?.name && (
                  <Button
                    type="primary"
                    onClick={() => setSignatureMode("accept")}
                  >
                    Accept / Complete
                  </Button>
                )}
            </Space>
            <Text type="secondary">
              Mobile parity note: signatures and role-based release/accept are
              now enforced on web too.
            </Text>
          </Space>
        )}
      </Modal>

      <PinVerifiedSignatureModal
        open={Boolean(signatureMode)}
        title={
          signatureMode === "release"
            ? "Release Pre-Inspection"
            : "Accept Pre-Inspection"
        }
        description={
          signatureMode === "release"
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
