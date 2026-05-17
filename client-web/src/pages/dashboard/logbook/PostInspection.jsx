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
  DatePicker,
  Descriptions,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Tabs,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { EditOutlined, ExportOutlined, SearchOutlined } from "@ant-design/icons";
import { AuthContext } from "../../../context/AuthContext";
import { API_BASE } from "../../../utils/API_BASE";
import PinVerifiedSignatureModal from "../../../components/common/PinVerifiedSignatureModal";
import dayjs from "dayjs";

const { Text } = Typography;
const STATUS_OPTIONS = ["all", "pending", "released", "completed"];
const POST_INSPECTION_TABS = [
  "Basic Information",
  "Station 1",
  "Station 2",
  "Engine and Station 3",
  "Main Rotor",
  "Cabin Interior",
  "Notes",
];

const station1Items = [
  {
    key: "station1_transparentPanels",
    title: "Transparent Panels",
    checks: [
      { subKey: "condition", label: "Condition, no cracks, cleanliness" },
      { subKey: "clean", label: "Clean if necessary" },
    ],
  },
  {
    key: "station1_doorsPillars",
    title: "Doors pillars",
    checks: [{ subKey: "condition", label: "Condition, no crack" }],
  },
  {
    key: "station1_sideSlipIndicator",
    title: "Side slip indicator",
    checks: [
      {
        subKey: "condition",
        label: "Condition, blanking cap removed or fitted as necessary",
      },
    ],
  },
  {
    key: "station1_sideSlipIndicator2",
    title: "Side slip indicator",
    checks: [{ subKey: "condition", label: "Condition" }],
  },
  {
    key: "station1_mgbEngineOilCooler",
    title: "MGB - Engine oil cooler inlet",
    checks: [
      {
        subKey: "condition",
        label:
          "Condition, no obstruction or debris, blanking removed or fitted as necessary",
      },
    ],
  },
];

const station2Items = [
  {
    key: "station2_frontDoorJettison",
    title: "Front door jettison system",
    checks: [{ subKey: "condition", label: "Condition, no crack on external jettison lever" }],
  },
  {
    key: "station2_leftCabinAccess",
    title: "Left cabin access doors",
    checks: [{ subKey: "condition", label: "Condition, security, locking, no abnormal freeplay" }],
  },
  {
    key: "station2_landingGear",
    title: "Landing gear",
    checks: [
      {
        subKey: "condition",
        label:
          "Condition of crosstubes, skids, wear resistant plates, footstep attachment",
      },
    ],
  },
  {
    key: "station2_staticPressure",
    title: "Static pressure points",
    checks: [{ subKey: "condition", label: "Condition, blanking removed or fitted as necessary" }],
  },
  { key: "station2_oatProbe", title: "OAT probe", checks: [{ subKey: "condition", label: "Condition, attachment" }] },
  { key: "station2_antennas", title: "Antennas under belly", checks: [{ subKey: "condition", label: "Condition" }] },
  { key: "station2_lights", title: "Landing and taxiing lights", checks: [{ subKey: "condition", label: "Condition" }] },
  { key: "station2_lowerCowlings", title: "Lower cowlings", checks: [{ subKey: "condition", label: "Condition, security" }] },
  {
    key: "station2_leftCargoDoorOpen",
    title: "Left cargo door",
    checks: [{ subKey: "opening", label: "Opening, condition, attachment points, no abnormal freeplay" }],
  },
  {
    key: "station2_leftCargoDoorClosed",
    title: "Left cargo door",
    checks: [{ subKey: "closed", label: "Closed and secured" }],
  },
  {
    key: "station2_fuelTank",
    title: "Fuel tank",
    checks: [
      {
        subKey: "condition",
        label:
          "Filler plug closed - Tank sump drained before first flight of the day and any aircraft displacement",
      },
    ],
  },
  {
    key: "station2_rearCargoDoorOpen",
    title: "Rear cargo door",
    checks: [{ subKey: "opening", label: "Opening, condition, attachment points, no abnormal freeplay" }],
  },
  { key: "station2_rearCargoBay", title: "Rear cargo bay", checks: [{ subKey: "harness", label: "Harness condition" }] },
  { key: "station2_elt", title: "ELT", checks: [{ subKey: "condition", label: "Condition, security, ARM or OFF as necessary" }] },
  { key: "station2_rearCargoDoorClosed", title: "Rear cargo door", checks: [{ subKey: "closed", label: "Closed and secured" }] },
  {
    key: "station2_mgbCowlings",
    title: "LH side MGB and engine cowlings",
    checks: [{ subKey: "opening", label: "Opening, condition of locking devices, no abnormal freeplay" }],
  },
  { key: "station2_upperCowling", title: "Upper cowling", checks: [{ subKey: "security", label: "Security" }] },
  { key: "station2_mgb", title: "MGB", checks: [{ subKey: "condition", label: "Condition, oil levels, no leaks" }] },
  { key: "station2_transmissionDeck", title: "Transmission deck", checks: [{ subKey: "cleanliness", label: "Cleanliness" }] },
  { key: "station2_mgbSupportBars", title: "MGB support bars", checks: [{ subKey: "condition", label: "Condition, security" }] },
  {
    key: "station2_hydraulicSystem",
    title: "Hydraulic system",
    checks: [{ subKey: "condition", label: "Condition, attachment points, pipes, no leaks" }],
  },
  { key: "station2_servos", title: "Servos", checks: [{ subKey: "security", label: "Security, no leaks or cracks" }] },
  { key: "station2_coolingFan", title: "Cooling fan", checks: [{ subKey: "condition", label: "Motor security, blade condition" }] },
  { key: "station2_gimbalRing", title: "Gimbal ring assembly", checks: [{ subKey: "fitting", label: "Fitting, safety pin set and locked" }] },
  { key: "station2_electricalHarnesses", title: "Electrical harnesses", checks: [{ subKey: "condition", label: "Condition, security" }] },
  { key: "station2_fuelShutoff", title: "Fuel shut-off valve", checks: [{ subKey: "condition", label: "Condition, security" }] },
  { key: "station2_mgbCowlingLH", title: "MGB cowling (LH side)", checks: [{ subKey: "safety", label: "Closed and secured" }] },
];

const engineItems = [
  { key: "engine_airInlet", title: "Engine air inlet", checks: [{ subKey: "condition", label: "Security, condition, seal condition" }] },
  { key: "engine_firewall", title: "Firewall", checks: [{ subKey: "condition", label: "Condition, check for cracks" }] },
  {
    key: "engine_accessories",
    title: "Engine and accessories",
    checks: [{ subKey: "condition", label: "General condition, cleanliness sealing, attachment pipes, electrical harness" }],
  },
  { key: "engine_transmissionDeck", title: "Engine transmission deck", checks: [{ subKey: "condition", label: "Condition, cleanliness, no leak" }] },
  { key: "engine_case", title: "Engine case", checks: [{ subKey: "condition", label: "Mounting pads condition" }] },
  { key: "engine_oilFilter", title: "Oil filter", checks: [{ subKey: "condition", label: "Clogging indicator retracted" }] },
  { key: "engine_fuelFilter", title: "Fuel filter", checks: [{ subKey: "condition", label: "Clogging indicator retracted" }] },
  { key: "engine_oilSystem", title: "Oil system", checks: [{ subKey: "condition", label: "Check for leaks" }] },
  { key: "engine_mounts", title: "Engine mounts", checks: [{ subKey: "condition", label: "Condition, security" }] },
  { key: "engine_deckDrainHoles", title: "Engine deck drain holes", checks: [{ subKey: "condition", label: "Free from obstructions and debris" }] },
  { key: "engine_exhaustPipe", title: "Exhaust pipe", checks: [{ subKey: "condition", label: "Condition, blanking fitted or removed, as necessary" }] },
];

const station3Items = [
  {
    key: "station3_scissors",
    title: "Scissors, swashplates, rods swivel bearings",
    checks: [{ subKey: "condition", label: "Condition, security, freeplay evolution (manual check)" }],
  },
  {
    key: "station3_swashPlate",
    title: "Swash plate/pitch change rods and end-fittings interface",
    checks: [{ subKey: "condition", label: "No contact traces or paint scaling on swashplate driving yokes" }],
  },
  {
    key: "station3_pitchChangeRods",
    title: "Pitch change rods",
    checks: [{ subKey: "condition", label: "Condition, no radial free play at end fittings, paint marks visible and aligned" }],
  },
  {
    key: "station3_rotorShaft",
    title: "Rotor shaft, all visible parts, particularly under the hub",
    checks: [{ subKey: "condition", label: "Paint condition, no cracks, crazing, blistering, corrosion nor tools marks" }],
  },
];

const mainRotorItems = [
  { key: "mainRotor_head", title: "Main Rotor Head", checks: [{ subKey: "condition", label: "Security, general condition" }] },
  { key: "mainRotor_starflex", title: "STARFLEX star", checks: [{ subKey: "condition", label: "No delamination, splinters" }] },
  { key: "mainRotor_starRecesses", title: "Star recesses", checks: [{ subKey: "condition", label: "No cracks" }] },
  {
    key: "mainRotor_sphericalBearings",
    title: "Spherical thrust bearings frequency adapters",
    checks: [
      {
        subKey: "condition",
        label:
          "No elastomeric defects, separation, scratches, blisters, extrusion or cracks other than minor and non-evolving surface defects",
      },
    ],
  },
  { key: "mainRotor_ballJoints", title: "Self-lubricating ball joints", checks: [{ subKey: "condition", label: "No debris nor free-play" }] },
  { key: "mainRotor_starArms", title: "Star arms end bushes", checks: [{ subKey: "condition", label: "No space between adhesive bead and bush" }] },
  { key: "mainRotor_vibrationAbsorber", title: "Vibration absorber", checks: [{ subKey: "condition", label: "Security" }] },
  {
    key: "mainRotor_blades",
    title: "Blades",
    checks: [
      {
        subKey: "condition",
        label:
          "Security, coating, tabs, polyurethane protection, no debonding, scratches, cracks, impacts, distortions, erosion holes, gaps or impacts",
      },
    ],
  },
  {
    key: "mainRotor_rightCargoDoor",
    title: "Right cargo door",
    checks: [
      { subKey: "opening", label: "Opening, condition, attachment points, no abnormal freeplay" },
      { subKey: "closed", label: "Closed and secured" },
    ],
  },
  { key: "mainRotor_gpuPlug", title: "GPU plug planet", checks: [{ subKey: "condition", label: "Closed or plugged-in, as applicable" }] },
  { key: "mainRotor_rhMgbCowling", title: "RH MGB cowling", checks: [{ subKey: "opening", label: "Opening, condition of locking systems, no abnormal freeplay" }] },
  { key: "mainRotor_transmissionDeck", title: "Transmission deck", checks: [{ subKey: "cleanliness", label: "Cleanliness" }] },
  { key: "mainRotor_mgbSupportBars", title: "MGB support bars", checks: [{ subKey: "condition", label: "Condition, security" }] },
  { key: "mainRotor_oilCooler", title: "Oil cooler, fan and pipes", checks: [{ subKey: "condition", label: "Condition, no leak, fan security, fan blades condition" }] },
  { key: "mainRotor_servos", title: "Servos", checks: [{ subKey: "security", label: "Security check for leaks or cracks" }] },
  {
    key: "mainRotor_hydraulicSystem",
    title: "Hydraulic System",
    checks: [{ subKey: "condition", label: "Security, pipes condition, check for leaks, filter clogging indicator retracted" }],
  },
  { key: "mainRotor_hydraulicTank", title: "Hydraulic system tank", checks: [{ subKey: "condition", label: "Level, no leak" }] },
  { key: "mainRotor_engineOilTank", title: "Engine oil tank", checks: [{ subKey: "condition", label: "Oil level, pipes condition, no leak" }] },
  { key: "mainRotor_electricalHarnesses", title: "Electrical harnesses", checks: [{ subKey: "condition", label: "Condition, security" }] },
  { key: "mainRotor_gimbalRing", title: "Gimbal ring assembly", checks: [{ subKey: "fitting", label: "Fitting, safety pins set and locked" }] },
  { key: "mainRotor_rhSideMgbCowling", title: "RH side MGB cowling", checks: [{ subKey: "closed", label: "Closed and secured" }] },
  { key: "mainRotor_landingGear", title: "Landing gear", checks: [{ subKey: "condition", label: "Condition of cross-tubes, skids, wear resistant plates, footstep security" }] },
  { key: "mainRotor_lowerFairings", title: "All lower central fairings", checks: [{ subKey: "closed", label: "Closed and secured" }] },
  { key: "mainRotor_rhCabinAccess", title: "RH cabin access doors", checks: [{ subKey: "condition", label: "Condition, security, locking, no abnormal freeplay" }] },
  { key: "mainRotor_frontDoorJettison", title: "Front door jettison system", checks: [{ subKey: "condition", label: "Condition, no crack" }] },
];

const cabinItems = [
  { key: "cabin_general", title: "Cabin", checks: [{ subKey: "cleanliness", label: "General cleanliness" }] },
  { key: "cabin_seats", title: "Seats", checks: [{ subKey: "condition", label: "Condition, attachment points" }] },
  { key: "cabin_doorJettison", title: "Door jettison system", checks: [{ subKey: "checked", label: "Checked - Plastic guard condition" }] },
  { key: "cabin_fireExtinguisher", title: "Fire Extinguisher", checks: [{ subKey: "condition", label: "Secured - Checked" }] },
  { key: "cabin_circuitBreakers", title: "Circuit Breakers", checks: [{ subKey: "set", label: "All set" }] },
  { key: "cabin_scu", title: "SCU", checks: [{ subKey: "position", label: "Check all pushbuttons in OFF position" }] },
  { key: "cabin_batterySwitchOn", title: "Battery Switch", checks: [{ subKey: "on", label: "ON, check battery voltage" }] },
  {
    key: "cabin_vemd",
    title: "VEMD",
    checks: [
      { subKey: "flightReport", label: "Check flights of the day report pages data" },
      { subKey: "flightTimes", label: "VEMD flight times" },
      { subKey: "cycles", label: "Ng and Nf cycles written in white characters and above 0" },
      { subKey: "advisoryMessages", label: "Check advisory messages of FAILURE or OVERLIMIT DETECTED" },
      { subKey: "recordData", label: "Record flights of the day data in aircraft and engine logbooks" },
    ],
  },
  { key: "cabin_batterySwitchOff", title: "Battery Switch", checks: [{ subKey: "off", label: "OFF" }] },
];

const CHECKLIST_GROUPS = [
  { title: "Station 1", items: station1Items },
  { title: "Station 2", items: station2Items },
  { title: "Engine and Engine Bay", items: engineItems },
  { title: "Station 3", items: station3Items },
  { title: "Main Rotor Head", items: mainRotorItems },
  { title: "Cabin Interior", items: cabinItems },
];
const CHECKLIST_KEYS = CHECKLIST_GROUPS.flatMap((group) =>
  group.items.flatMap((item) =>
    item.checks.map((check) => `${item.key}_${check.subKey}`),
  ),
);

const signaturePayload = (user, signature) => ({
  name:
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
    user?.username ||
    "User",
  id: user?.id || user?._id || "",
  signature,
  timestamp: new Date().toISOString(),
});

const getDefaultSignature = () => ({
  name: "",
  id: "",
  signature: "",
  timestamp: "",
});

const getDefaultPostInspectionFormData = (userRole = "") => ({
  aircraftType: "",
  rpc: "",
  date: dayjs().format("MM/DD/YYYY"),
  dateAdded: "",
  createdBy: userRole,
  status: "pending",
  notes: "",
  ...Object.fromEntries(CHECKLIST_KEYS.map((key) => [key, false])),
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

export default function PostInspection() {
  const { user, getAuthHeader } = useContext(AuthContext);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [aircraft, setAircraft] = useState("all");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState(null);
  const [signatureMode, setSignatureMode] = useState(null);

  const role = user?.jobTitle?.toLowerCase() || "";
  const readOnly = role === "officer-in-charge";
  const canRelease = role === "mechanic" || role === "maintenance manager";

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/api/post-inspections/getAllPostInspection`,
        { headers: await getAuthHeader() },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to load post-inspections");
      setRecords(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      message.error(error.message || "Failed to load post-inspections");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  useEffect(() => {
    load();
  }, [load]);

  const aircraftOptions = useMemo(
    () => ["all", ...new Set(records.map((item) => item.rpc).filter(Boolean))],
    [records],
  );

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
          status === "all" || getDisplayStatus(item.status) === status;
        return matchesQuery && matchesAircraft && matchesStatus;
      }),
    [records, query, aircraft, status],
  );

  const validateBeforeRelease = (payload) => {
    if (!payload?.rpc?.trim() || !payload?.aircraftType?.trim()) {
      message.warning("RP/C and aircraft type are required");
      return false;
    }
    if (!areAllInspectionChecksComplete(payload)) {
      message.warning("All checklist fields must be checked before release.");
      return false;
    }
    return true;
  };

  const saveEdit = async (nextPayload = editing) => {
    if (!nextPayload?._id) return;
    try {
      const response = await fetch(
        `${API_BASE}/api/post-inspections/updatePostInspectionById/${nextPayload._id}`,
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
        throw new Error(data.message || "Failed to update post-inspection");
      setEditing(data.data);
      await load();
      message.success("Post-inspection updated");
    } catch (error) {
      message.error(error.message || "Failed to update post-inspection");
    }
  };

  const handleSignedAction = async (signature) => {
    if (!editing || !validateBeforeRelease(editing)) return;
    await saveEdit({
      ...editing,
      status: "completed",
      releasedBy: signaturePayload(user, signature),
    });
    setSignatureMode(null);
  };

  const updateEditing = (field, value) =>
    setEditing((prev) => ({ ...prev, [field]: value }));

  const downloadInspectionDocument = async (record, format) => {
    if (!record?._id) {
      message.error("Invalid inspection data");
      return;
    }

    const exportPath = format === "pdf" ? "export-pdf" : "export-document";
    const extension = format === "pdf" ? "pdf" : "docx";
    const fileName = sanitizeFileName(
      `Post-Inspection-${record.rpc || "N-A"}-${record.date || dayjs().format("MM-DD-YYYY")}.${extension}`,
    );

    try {
      const response = await fetch(
        `${API_BASE}/api/inspections/post/${record._id}/${exportPath}`,
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

  const setGroupChecked = (group, checked) => {
    setEditing((prev) => ({
      ...prev,
      ...Object.fromEntries(
        group.items.flatMap((item) =>
          item.checks.map((check) => [`${item.key}_${check.subKey}`, checked]),
        ),
      ),
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

  const renderChecklistGroup = (group, record, isEditable) => {
    const groupKeys = group.items.flatMap((item) =>
      item.checks.map((check) => `${item.key}_${check.subKey}`),
    );
    const allChecked = groupKeys.every((key) => Boolean(record?.[key]));

    return (
      <Card
        key={group.title}
        size="small"
        title={group.title}
        extra={
          isEditable ? (
            <Checkbox
              checked={allChecked}
              onChange={(event) => setGroupChecked(group, event.target.checked)}
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
              <div>
                <Text strong>
                  {index + 1}. {item.title}
                </Text>
                <Space direction="vertical" size={4} style={{ width: "100%", marginTop: 6 }}>
                  {item.checks.map((check) => {
                    const fieldKey = `${item.key}_${check.subKey}`;
                    return (
                      <Checkbox
                        key={fieldKey}
                        checked={Boolean(record?.[fieldKey])}
                        disabled={!isEditable}
                        onChange={(event) =>
                          updateEditing(fieldKey, event.target.checked)
                        }
                      >
                        <Text type="secondary">{check.label}</Text>
                      </Checkbox>
                    );
                  })}
                </Space>
              </div>
            </Col>
          ))}
        </Row>
      </Card>
    );
  };

  const renderBasicInformation = (record) => (
    <Card
      title="Rotary Winged Aircraft - Single Engine"
      size="small"
      styles={{ header: { background: "#1677ff", color: "#fff" } }}
    >
      <Row gutter={[12, 12]}>
        <Col xs={24} md={8}>
          <Input size="large" value={record.rpc} placeholder="RP/C" disabled />
        </Col>
        <Col xs={24} md={8}>
          <Input
            size="large"
            value={record.aircraftType}
            placeholder="Aircraft Type"
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

  const renderNotes = (record, isEditable) => (
    <Card
      title="Notes"
      size="small"
      styles={{ header: { background: "#1677ff", color: "#fff" } }}
    >
      <Input.TextArea
        rows={5}
        placeholder="Enter post-inspection notes, discrepancy signals, or remarks"
        value={record.notes || ""}
        onChange={(event) => updateEditing("notes", event.target.value)}
        disabled={!isEditable}
      />
    </Card>
  );

  const renderPostInspectionTabs = (record, isEditable) => (
    <Tabs
      items={POST_INSPECTION_TABS.map((tab) => ({
        key: tab,
        label: tab,
        children:
          tab === "Basic Information" ? (
            renderBasicInformation(record)
          ) : tab === "Station 1" ? (
            renderChecklistGroup(CHECKLIST_GROUPS[0], record, isEditable)
          ) : tab === "Station 2" ? (
            renderChecklistGroup(CHECKLIST_GROUPS[1], record, isEditable)
          ) : tab === "Engine and Station 3" ? (
            <>
              {renderChecklistGroup(CHECKLIST_GROUPS[2], record, isEditable)}
              {renderChecklistGroup(CHECKLIST_GROUPS[3], record, isEditable)}
            </>
          ) : tab === "Main Rotor" ? (
            renderChecklistGroup(CHECKLIST_GROUPS[4], record, isEditable)
          ) : tab === "Cabin Interior" ? (
            renderChecklistGroup(CHECKLIST_GROUPS[5], record, isEditable)
          ) : (
            renderNotes(record, isEditable)
          ),
      }))}
    />
  );

  const hasAnyEditingSignature = Boolean(
    editing?.releasedBy?.name || editing?.acceptedBy?.name,
  );
  const isEditingFormEditable =
    Boolean(editing) && !readOnly && !hasAnyEditingSignature;
  const showReleaseButton =
    canRelease &&
    !readOnly &&
    editing?.status === "pending" &&
    !editing?.releasedBy?.name;

  return (
    <div style={{ padding: 20 }}>
      <Card>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={9}>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col xs={24} md={7}>
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
                  icon={<EditOutlined />}
                  onClick={() =>
                    setEditing({
                      ...getDefaultPostInspectionFormData(role),
                      ...record,
                    })
                  }
                >
                  {readOnly ? "View" : "Edit"}
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
                if (validateBeforeRelease(editing)) {
                  setSignatureMode("release");
                }
              }}
            >
              Release
            </Button>
          ) : null,
        ].filter(Boolean)}
        title={readOnly ? "View Post-Inspection" : "Edit Post-Inspection"}
        width={1140}
      >
        {editing && (
          <Space direction="vertical" style={{ width: "100%" }} size={14}>
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

            {renderPostInspectionTabs(editing, isEditingFormEditable)}
            {renderSignatureCard(
              "Released By",
              editing.releasedBy,
              role === "maintenance manager" ? "MAINTENANCE MANAGER" : "MECHANIC",
            )}
            {renderSignatureCard("Accepted By", editing.acceptedBy, "PILOT")}
          </Space>
        )}
      </Modal>

      <PinVerifiedSignatureModal
        open={Boolean(signatureMode)}
        title="Release Post-Inspection"
        description="Draw your release signature."
        confirmDescription="Enter your 6-digit PIN to confirm this signature."
        onCancel={() => setSignatureMode(null)}
        onSave={handleSignedAction}
      />
    </div>
  );
}
