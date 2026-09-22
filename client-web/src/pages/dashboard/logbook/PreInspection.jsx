import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  Tabs,
  Tooltip,
  Typography,
  DatePicker,
  Grid,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  ExportOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { AuthContext } from "../../../context/AuthContext";
import { API_BASE } from "../../../utils/API_BASE";
import ResponsiveTable from "../../../components/common/ResponsiveTable";
import FlightWorkspace from "../../../components/pagecomponents/FlightWorkspace";
import AircraftLogGroups from "../../../components/common/AircraftLogGroups";
import { isAssignedFlightCrew } from "../../../../../shared/flightCrewAccess";
import InspectionFlightLogPicker from "../../../components/pagecomponents/InspectionFlightLogPicker";
import { confirmAction } from "../../../utils/confirmAction";
import { renderStatusTag } from "../../../utils/statusTags";
import ResultPopup from "../../../components/common/ResultPopup";
import PinVerifiedSignatureModal from "../../../components/common/PinVerifiedSignatureModal";
import dayjs from "dayjs";
import { useLocation, useNavigate } from "react-router-dom";
import { matchesSearch } from "../../../utils/search";
import { canExportModule } from "../../../../../shared/exportAccess";
import { getLogAircraftRegistration } from "../../../../../shared/aircraftLogGroups";
import PreInspectionB412Checklist from "../../../components/pagecomponents/PreInspectionB412Checklist";
import {
  B412_PRE_INSPECTION_SECTIONS,
  areAllB412ChecksComplete,
  createEmptyB412PreInspectionData,
  isB412Aircraft,
} from "../../../utils/b412PreInspection";

const { Text } = Typography;
const { useBreakpoint } = Grid;
const STATUS_OPTIONS = ["all", "released", "completed"];
const BASE_OPTIONS = ["MANILA", "CEBU", "CDO"];
const formatDate = (value) => (value ? dayjs(value).format("MM/DD/YYYY") : "");
const isValidDate = (value) =>
  /^\d{2}\/\d{2}\/\d{4}$/.test(String(value || "")) &&
  dayjs(value, "MM/DD/YYYY").isValid();

const getDefaultPreInspectionDraft = (user = null) => ({
  aircraftType: "",
  rpc: "",
  base: user?.base || "",
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

const FIELD_META = {
  station1_transparentPanels: {
    title: "Transparent Panels",
    label: "Condition - Cleanliness",
  },
  station1_engineOilCooler: {
    title: "Engine oil cooler air inlet",
    label: "Check no obstruction nor debris",
  },
  station1_sideSlipIndicator: {
    title: "Side slip indicator",
    label: "Condition",
  },
  station1_pitotTube: {
    title: "Pitot tube",
    label: "Cover removed - Condition",
  },
  station1_landingLights: { title: "Landing lights", label: "Condition" },
  station2_frontDoor: {
    title: "Front door",
    label: "Condition jettison system check",
  },
  station2_rearDoor: {
    title: "Rear door",
    label: "Condition, closed, or opened lock (sliding door)",
  },
  station2_leftCargoDoorOpen: { title: "Left cargo door", label: "Open" },
  station2_loadsObjects: {
    title: "Loads and objects carried",
    label: "Secured",
  },
  station2_leftCargoDoorClosed: {
    title: "Left cargo door",
    label: "Closed, locked",
  },
  station2_fuelTank: {
    title: "Fuel tank and system",
    label: "Filler plug closed, Tank sump drained",
  },
  station1_mgbCowl: { title: "MGB cowl", label: "MGB oil level - Cowl locked" },
  station1_lowerFairings: {
    title: "All lower fairings panels",
    label: "Locked",
  },
  station1_landingGear: {
    title: "Landing gear and footstep",
    label: "Secure - Visual Check",
  },
  station1_staticPorts: {
    title: "Static ports",
    label: "Clear, covers removed",
  },
  station1_oatSensor: { title: "OAT sensor, antennas", label: "Condition" },
  station1_mainRotor: {
    title: "Main rotor head blades",
    label: "Visual inspection, no impact",
  },
  station1_engineAirIntake: {
    title: "Engine air intake",
    label: "Clear (water, snow foreign object)",
  },
  station1_engineCowl: { title: "Engine cowl", label: "Locked" },
  station1_exhaustCover: { title: "Exhaust cover", label: "Removed" },
  station1_rearCargoDoorOpen: { title: "Rear cargo door", label: "Opened" },
  station1_loadsObjects: {
    title: "Loads and object carried",
    label: "Secured",
  },
  station1_elt: { title: "ELT", label: "Check ARMED" },
  station1_rearCargoDoorClosed: {
    title: "Rear cargo door",
    label: "Closed, locked",
  },
  station1_oilDrain: { title: "Oil drain", label: "No oil under scupper" },
  station3_heatShield: {
    title: "Heat shield on tail drive",
    label: "Condition, attachment",
  },
  station3_tailBoom: {
    title: "Tail boom, antennas",
    label: "Condition - Fairings fasteners locked",
  },
  station3_stabilizer: {
    title: "Stabilizer, fin, external lights",
    label: "General condition",
  },
  station3_tailRotorGuard: {
    title: "Tail rotor guard (if fitted)",
    label: "Condition, attachment",
  },
  station3_tgbFairing: {
    title: "TGB fairing",
    label: "Secured, fasteners locked",
  },
  station3_tgbOilLevel: { title: "TGB oil level", label: "Checked" },
  station3_tailSkid: { title: "Tail skid", label: "Condition, attachment" },
  station3_flexibleCoupling: {
    title: "Flexible Coupling",
    label: "Visual Check No Crack",
  },
  sling_sling: { title: "Sling", label: "Security - General condition" },
  sling_cablePins: {
    title: "Cable and Pins",
    label: "Condition, attachment points",
  },
  floats_lhRh: {
    title: "LH & RH Floats",
    label: "Security - General Condition",
  },
  floats_cylinder: {
    title: "Cylinder",
    label: "Pressure & Condition, attachment points",
  },
  floats_hoses: { title: "Hoses", label: "Condition, attachment points" },
  onboard_firstAid: { title: "First Aid Kit", label: "Condition, no expired" },
  onboard_lifeVest: {
    title: "Life Vest",
    label: "Condition, cleanliness & no damage",
  },
  onboard_lifeRaft: {
    title: "Life-raft",
    label: "Condition, cleanliness & no damage",
  },
  onboard_axl: { title: "AXL", label: "Security - General Condition" },
  onboard_fireExt: {
    title: "Fire Extinguisher",
    label: "Security - General Condition",
  },
  onboard_certAirworthiness: {
    title: "Certificate of Airworthiness",
    label: "Onboard",
  },
  onboard_certRegistration: {
    title: "Certificate of Registration",
    label: "Onboard",
  },
  onboard_radioLicense: { title: "Radio License", label: "Onboard" },
  onboard_flightLogbook: { title: "Flight Logbook", label: "Onboard" },
};

const CHECKLIST_GROUPS = {
  station12: [
    {
      title: "Station 1",
      fields: [
        "station1_transparentPanels",
        "station1_engineOilCooler",
        "station1_sideSlipIndicator",
        "station1_pitotTube",
        "station1_landingLights",
      ],
    },
    {
      title: "Station 2",
      fields: [
        "station2_frontDoor",
        "station2_rearDoor",
        "station2_leftCargoDoorOpen",
        "station2_loadsObjects",
        "station2_leftCargoDoorClosed",
        "station2_fuelTank",
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
      ],
    },
  ],
  station3sling: [
    {
      title: "Station 3",
      fields: [
        "station3_heatShield",
        "station3_tailBoom",
        "station3_stabilizer",
        "station3_tailRotorGuard",
        "station3_tgbFairing",
        "station3_tgbOilLevel",
        "station3_tailSkid",
        "station3_flexibleCoupling",
      ],
    },
    {
      title: "Sling",
      fields: ["sling_sling", "sling_cablePins"],
    },
  ],
  floats: [
    {
      title: "Floats",
      fields: ["floats_lhRh", "floats_cylinder", "floats_hoses"],
    },
    {
      title: "Mandatory Onboard",
      fields: [
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
  ],
};

const RELEASE_CHECK_FIELDS = Object.values(CHECKLIST_GROUPS).flatMap((groups) =>
  groups.flatMap((group) => group.fields),
);
const normalizeAircraftType = (value = "") =>
  String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
const isAS350Aircraft = (aircraftType = "") =>
  normalizeAircraftType(aircraftType).includes("AS350B3");
const areAllReleaseChecksComplete = (record = {}) => {
  if (isB412Aircraft(record.aircraftType)) {
    return areAllB412ChecksComplete(record.b412Data);
  }

  if (!isAS350Aircraft(record.aircraftType)) return false;
  return RELEASE_CHECK_FIELDS.every((field) => Boolean(record[field]));
};
const resetAircraftInspectionValues = (
  record = {},
  { b412Data = undefined } = {},
) => {
  const next = {
    ...record,
    aircraftType: "",
    fob: "",
    b412Data,
  };
  RELEASE_CHECK_FIELDS.forEach((field) => {
    next[field] = false;
  });
  return next;
};
const hasValidFob = (record = {}) => {
  const value = String(record.fob ?? "").trim();
  if (!value) return false;

  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0;
};

const sanitizeFileName = (value) =>
  String(value || "pre-flight inspection")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-");

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

export default function PreInspection() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { user, getAuthHeader } = useContext(AuthContext);
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
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(() => getDefaultPreInspectionDraft(user));
  const [createActiveTab, setCreateActiveTab] = useState("basic");
  const [rpcOptions, setRpcOptions] = useState([]);
  const [signatureMode, setSignatureMode] = useState(null);
  const [createSelectAllState, setCreateSelectAllState] = useState({});
  const draftRpcRequestRef = useRef(0);
  const editingRpcRequestRef = useRef(0);
  const [popup, setPopup] = useState({
    open: false,
    status: "success",
    title: "",
    subTitle: "",
  });

  const role = user?.jobTitle?.toLowerCase() || "";
  const readOnly = role === "officer-in-charge";
  const lockedCreateRpc =
    selectedAircraft === "Unassigned aircraft" ? "" : selectedAircraft || "";
  const canCreate = role === "mechanic";
  const canRelease = ["mechanic", "maintenance manager", "superadmin"].includes(
    role,
  );
  const canAccept = role === "pilot";
  const getDisplayStatus = (value) =>
    String(value || "").toLowerCase() === "completed"
      ? "completed"
      : String(value || "").toLowerCase() === "released"
        ? "released"
        : "pending";
  const isCompletedInspection = (record) =>
    getDisplayStatus(record?.status) === "completed";
  const isAcceptableByPilot = (record) =>
    isAssignedFlightCrew(user, record) &&
    canAccept &&
    getDisplayStatus(record?.status) === "released" &&
    !record?.acceptedBy?.name;
  const isRecordReadOnly = (record) =>
    !isAssignedFlightCrew(user, record) ||
    readOnly ||
    isCompletedInspection(record) ||
    getDisplayStatus(record?.status) === "released";
  const getRecordActionLabel = (record) =>
    isAcceptableByPilot(record) ? "Accept" : "View";

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
      const response = await fetch(
        `${API_BASE}/api/parts-monitoring/${encodeURIComponent(rpc)}`,
      );
      const data = await response.json();
      if (response.ok && data?.data) {
        return data.data.aircraftType || "";
      }
      return "";
    } catch {
      return "";
    }
  };

  const handleDraftRpcChange = async (rpc) => {
    const requestId = ++draftRpcRequestRef.current;
    setCreateActiveTab("basic");
    setCreateSelectAllState({});
    setDraft((prev) => ({
      ...resetAircraftInspectionValues(prev),
      rpc,
      flightLogId: null,
      assignedPilot: null,
      assignedMechanic: null,
    }));

    const aircraftType = await resolveAircraftTypeByRpc(rpc);
    if (requestId !== draftRpcRequestRef.current) return;

    setDraft((prev) => {
      if (String(prev.rpc || "") !== String(rpc || "")) return prev;
      return {
        ...prev,
        aircraftType,
        b412Data: isB412Aircraft(aircraftType)
          ? createEmptyB412PreInspectionData()
          : undefined,
      };
    });
  };

  const handleEditingRpcChange = async (rpc) => {
    const requestId = ++editingRpcRequestRef.current;
    setEditing((prev) =>
      prev
        ? {
            ...resetAircraftInspectionValues(prev, { b412Data: null }),
            rpc,
          }
        : prev,
    );

    const aircraftType = await resolveAircraftTypeByRpc(rpc);
    if (requestId !== editingRpcRequestRef.current) return;

    setEditing((prev) => {
      if (!prev || String(prev.rpc || "") !== String(rpc || "")) return prev;
      return {
        ...prev,
        aircraftType,
        b412Data: isB412Aircraft(aircraftType)
          ? createEmptyB412PreInspectionData()
          : null,
      };
    });
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
  const editingReadOnly = editing ? isRecordReadOnly(editing) : readOnly;
  const editingCanAccept = editing ? isAcceptableByPilot(editing) : false;
  const draftHasAircraft = Boolean(
    String(draft.rpc || "").trim() && String(draft.aircraftType || "").trim(),
  );
  const draftIsB412 = draftHasAircraft && isB412Aircraft(draft.aircraftType);
  const draftIsAS350 = draftHasAircraft && isAS350Aircraft(draft.aircraftType);
  const createFormSections = useMemo(() => {
    if (!draftHasAircraft) return [CREATE_FORM_SECTIONS[0]];
    if (draftIsB412) {
      return [
        CREATE_FORM_SECTIONS[0],
        ...B412_PRE_INSPECTION_SECTIONS.map((section) => ({
          key: `b412:${section.key}`,
          label: section.title,
          b412SectionKey: section.key,
        })),
      ];
    }
    if (draftIsAS350) return CREATE_FORM_SECTIONS;
    return [CREATE_FORM_SECTIONS[0]];
  }, [draftHasAircraft, draftIsAS350, draftIsB412]);

  const saveCreate = async () => {
    if (!draft.flightLogId) { message.warning("Select the Flight Log for this inspection."); return false; }
    try {
      const headers = { ...(await getAuthHeader()), "Content-Type": "application/json", "x-action-confirmed": "true" };
      const path = API_BASE + "/api/flightlogs/" + draft.flightLogId;
      const currentResponse = await fetch(path + "/workspace", { headers });
      const current = await currentResponse.json();
      if (!currentResponse.ok) throw Error(current.message);
      const response = await fetch(path + "/inspections", { method: "POST", headers, body: JSON.stringify({ changes: draft, expectedVersion: current.data.flightLog.__v || 0 }) });
      const result = await response.json();
      if (!response.ok) throw Error(result.message);
      setCreating(false); setEditing({ ...result.data.pre, flightLogId: draft.flightLogId });
      setDraft(getDefaultPreInspectionDraft(user)); setCreateActiveTab("basic"); setCreateSelectAllState({});
      await load(); return true;
    } catch (error) { message.error(error.message || "Could not create inspection draft."); return false; }
  };

  const saveEdit = async (
    nextPayload = editing,
    { throwOnError = false } = {},
  ) => {
    if (!nextPayload?._id) return false;
    const currentRecord = records.find(
      (record) => String(record._id) === String(nextPayload._id),
    );
    if (isCompletedInspection(currentRecord || editing)) {
      message.info("Completed pre-flight inspections are view-only.");
      return false;
    }
    if (!nextPayload.rpc?.trim() || !nextPayload.aircraftType?.trim()) {
      message.warning("RP/C and aircraft type are required");
      return false;
    }
    if (!nextPayload.date || !isValidDate(nextPayload.date)) {
      message.warning("Please select a valid date");
      return false;
    }
    try {
      const updatePayload = isB412Aircraft(nextPayload.aircraftType)
        ? {
            ...nextPayload,
            b412Data: createEmptyB412PreInspectionData(nextPayload.b412Data),
          }
        : { ...nextPayload, b412Data: null };
      const response = await fetch(
        `${API_BASE}/api/pre-flight/updatePreInspectionById/${nextPayload._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(await getAuthHeader()),
          },
          body: JSON.stringify({ ...updatePayload, confirmAction: true }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.message || "Failed to update pre-flight inspection",
        );
      setEditing(data.data);
      await load();
      const savedAircraft = getLogAircraftRegistration(data.data || nextPayload);
      if (savedAircraft !== selectedAircraft) {
        openAircraft(savedAircraft);
      }
      setPopup({
        open: true,
        status: "success",
        title: "Pre-inspection updated",
        subTitle: "The pre-flight inspection has been updated successfully.",
      });
      return true;
    } catch (error) {
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: error.message || "Failed to update pre-flight inspection",
      });
      if (throwOnError) throw error;
      return false;
    }
  };

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

  const requestEditRelease = async () => {
    if (!editing) return;
    if (!areAllReleaseChecksComplete(editing)) {
      message.warning(
        "Please check all pre-flight inspection items before release",
      );
      return;
    }
    if (!hasValidFob(editing)) {
      message.warning("FOB must be filled in before release.");
      return;
    }

    const confirmed = await confirmAction({
      title: "Release Pre-Flight Inspection",
      content: "Release this pre-flight inspection log?",
      okText: "Release",
    });
    if (confirmed) setSignatureMode("release");
  };

  const requestAccept = async () => {
    if (!editingCanAccept) return;
    if (!hasValidFob(editing)) {
      message.warning("FOB must be filled in before acceptance.");
      return;
    }

    const confirmed = await confirmAction({
      title: "Accept Pre-Flight Inspection",
      content: "Accept and complete this pre-flight inspection log?",
      okText: "Accept",
    });
    if (confirmed) setSignatureMode("accept");
  };

  const handleSignedAction = async (signature) => {
    if (signatureMode === "create-release") {
      await saveCreate(signature);
      setSignatureMode(null);
      return;
    }
    if (!editing) return;
    if (signatureMode === "release") {
      await saveEdit(
        {
          ...editing,
          status: "released",
          releasedBy: signaturePayload(user, signature),
        },
        { throwOnError: true },
      );
    }
    if (signatureMode === "accept") {
      await saveEdit(
        {
          ...editing,
          status: "completed",
          acceptedBy: signaturePayload(user, signature),
        },
        { throwOnError: true },
      );
    }
    setSignatureMode(null);
  };

  const setAllCreateFields = (fields = [], checked = false) => {
    setDraft((prev) => {
      const next = { ...prev };
      fields.forEach((field) => {
        next[field] = checked;
      });
      return next;
    });
  };

  const renderChecklistGroup = (sectionKey, group) => {
    const allChecked = group.fields.every((field) => Boolean(draft[field]));
    const groupStateKey = `${sectionKey}:${group.title}`;
    const selectedAll = createSelectAllState[groupStateKey] ?? allChecked;

    return (
      <Card
        key={groupStateKey}
        size="small"
        title={group.title}
        styles={{ header: { backgroundColor: "#0A7D37", color: "#fff" } }}
      >
        <Space orientation="vertical" size={12} style={{ width: "100%" }}>
          <Checkbox
            checked={selectedAll}
            onChange={(event) => {
              const checked = event.target.checked;
              setCreateSelectAllState((prev) => ({
                ...prev,
                [groupStateKey]: checked,
              }));
              setAllCreateFields(group.fields, checked);
            }}
          >
            Select All
          </Checkbox>

          <Row gutter={[12, 12]}>
            {group.fields.map((field, index) => {
              const meta = FIELD_META[field] || { title: field, label: "" };
              return (
                <Col xs={24} md={12} key={field}>
                  <Card size="small" styles={{ body: { padding: 10 } }}>
                    <Space
                      orientation="vertical"
                      size={6}
                      style={{ width: "100%" }}
                    >
                      <Text strong>
                        {index + 1}. {meta.title}
                      </Text>
                      <Checkbox
                        checked={Boolean(draft[field])}
                        onChange={(event) =>
                          setDraft((prev) => ({
                            ...prev,
                            [field]: event.target.checked,
                          }))
                        }
                      >
                        {meta.label}
                      </Checkbox>
                    </Space>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </Space>
      </Card>
    );
  };

  return (
    <div style={{ padding: isMobile ? 12 : 20 }}>
      {(selectedAircraft || canCreate) && (
        <Row
          gutter={[12, 12]}
          align="middle"
          justify="space-between"
          style={{ marginBottom: 16 }}
        >
          <Col xs={24} sm={canCreate ? 16 : 24}>
            {selectedAircraft && (
              <>
                <Button
                  type="text"
                  icon={<ArrowLeftOutlined />}
                  onClick={backToAircraft}
                  style={{ paddingInline: 0 }}
                >
                  Back to Aircraft
                </Button>
                <Typography.Title level={4} style={{ margin: "8px 0 0" }}>
                  {selectedAircraft} — Pre-Flight Inspections
                </Typography.Title>
              </>
            )}
          </Col>
          {canCreate && (
            <Col xs={24} sm={8} style={{ textAlign: "right" }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setDraft(getDefaultPreInspectionDraft(user));
                  handleDraftRpcChange(lockedCreateRpc);
                  setCreateActiveTab("basic");
                  setCreating(true);
                }}
                size="large"
                block={isMobile}
              >
                New Entry
              </Button>
            </Col>
          )}
        </Row>
      )}

      {!selectedAircraft ? (
        <AircraftLogGroups
          records={records}
          sortBy="latestActivity"
          loading={loading}
          query={aircraftQuery}
          onQueryChange={setAircraftQuery}
          onSelect={openAircraft}
          emptyText="No pre-flight inspections found."
        />
      ) : (
        <>
      <Card>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={16}>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              prefix={<SearchOutlined />}
              size="large"
              allowClear
            />
          </Col>
          <Col xs={24} md={8}>
            <Select
              style={{ width: "100%" }}
              value={status}
              onChange={setStatus}
              options={STATUS_OPTIONS.map((value) => ({
                value,
                label: value === "all" ? "ALL STATUS" : value.toUpperCase(),
              }))}
              size="large"
            />
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
                <Tooltip title={getRecordActionLabel(record)}>
                  <Button
                    aria-label={getRecordActionLabel(record)}
                    icon={
                      isAcceptableByPilot(record) ? (
                        <CheckOutlined />
                      ) : (
                        <EyeOutlined />
                      )
                    }
                    onClick={() => {
                      editingRpcRequestRef.current += 1;
                      setEditing(record);
                    }}
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
        open={creating}
        onCancel={() => {
          draftRpcRequestRef.current += 1;
          setCreating(false);
          setDraft(getDefaultPreInspectionDraft(user));
          setCreateActiveTab("basic");
          setCreateSelectAllState({});
        }}
        onOk={() => saveCreate()}
        title="Release Pre-Flight Inspection"
        okText="Create Draft"
        okButtonProps={{ disabled: !draft.flightLogId }}
        width={isMobile ? "100%" : 1140}
        destroyOnHidden
        centered
        zIndex={9999}
        styles={{
          body: { maxHeight: "70vh", overflowY: "auto", paddingTop: 12 },
        }}
      >
        <Tabs
          activeKey={createActiveTab}
          onChange={setCreateActiveTab}
          items={createFormSections.map((section) => ({
            key: section.key,
            label: section.label,
            children: (
              <Space orientation="vertical" style={{ width: "100%" }} size={12}>
                {section.key === "basic" ? (
                  <Card
                    size="small"
                    title={
                      draftIsB412
                        ? "Rotary Winged Aircraft - Twin Engine"
                        : draftIsAS350
                          ? "Rotary Winged Aircraft - Single Engine"
                          : "Aircraft Information"
                    }
                    styles={{
                      header: { backgroundColor: "#0A7D37", color: "#fff" },
                    }}
                  >
                    <Row gutter={[12, 12]}>
                      <Col span={24}>
                        <Text strong>Linked Flight Log *</Text>
                        <InspectionFlightLogPicker
                          rpc={draft.rpc} value={draft.flightLogId} active={creating}
                          onChange={(log) => setDraft((prev) => ({ ...prev, flightLogId: log?._id || null, assignedPilot: log?.assignedPilot || null, assignedMechanic: log?.assignedMechanic || null }))}
                        />
                        <Text type="secondary">Pilot: {draft.assignedPilot?.name || "Not assigned"} · Mechanic: {draft.assignedMechanic?.name || "Not assigned"}</Text>
                      </Col>
                      <Col xs={24} md={12}>
                        <Text
                          strong
                          style={{ display: "block", marginBottom: 6 }}
                        >
                          Base
                        </Text>
                        <Select
                          size="large"
                          style={{ width: "100%" }}
                          value={draft.base || undefined}
                          onChange={(value) =>
                            setDraft((prev) => ({
                              ...prev,
                              base: value,
                            }))
                          }
                          placeholder="Select Base"
                          options={BASE_OPTIONS.map((base) => ({
                            value: base,
                            label: base,
                          }))}
                        />
                      </Col>
                      <Col xs={24} md={12}>
                        <Text
                          strong
                          style={{ display: "block", marginBottom: 6 }}
                        >
                          RP/C
                        </Text>
                        <Select
                          size="large"
                          style={{ width: "100%" }}
                          value={draft.rpc}
                          onChange={handleDraftRpcChange}
                          disabled={Boolean(lockedCreateRpc)}
                          placeholder="Select RP/C"
                          showSearch={{
                            optionFilterProp: "label",
                            filterOption: (input, option) =>
                              String(option?.label || "")
                                .toLowerCase()
                                .includes(input.toLowerCase()),
                          }}
                          options={rpcDropdownOptions.map((rpc) => ({
                            value: rpc,
                            label: rpc,
                          }))}
                        />
                      </Col>
                      <Col xs={24} md={12}>
                        <Text
                          strong
                          style={{ display: "block", marginBottom: 6 }}
                        >
                          Aircraft Type
                        </Text>
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
                          readOnly={true}
                        />
                      </Col>
                      <Col xs={24} md={12}>
                        <Text
                          strong
                          style={{ display: "block", marginBottom: 6 }}
                        >
                          Date
                        </Text>
                        <DatePicker
                          size="large"
                          style={{ width: "100%" }}
                          format="MM/DD/YYYY"
                          inputReadOnly
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
                      <Col xs={24} md={12}>
                        <Text
                          strong
                          style={{ display: "block", marginBottom: 6 }}
                        >
                          Fuel On Board
                        </Text>
                        <Input
                          type={"number"}
                          size="large"
                          value={draft.fob}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              fob: e.target.value,
                            }))
                          }
                          placeholder="Fuel On Board"
                          min={0}
                          max={100}
                        />
                      </Col>
                    </Row>
                  </Card>
                ) : section.b412SectionKey ? (
                  <PreInspectionB412Checklist
                    sectionKey={section.b412SectionKey}
                    value={draft.b412Data}
                    onChange={(b412Data) =>
                      setDraft((prev) => ({ ...prev, b412Data }))
                    }
                  />
                ) : (
                  <Space
                    orientation="vertical"
                    size={14}
                    style={{ width: "100%" }}
                  >
                    {(CHECKLIST_GROUPS[section.key] || []).map((group) =>
                      renderChecklistGroup(section.key, group),
                    )}
                    {section.key === "floats" ? (
                      <Card
                        size="small"
                        title="Fuel On Board"
                        styles={{
                          header: { backgroundColor: "#0A7D37", color: "#fff" },
                        }}
                      >
                        <Text
                          strong
                          style={{ display: "block", marginBottom: 8 }}
                        >
                          Fuel On Board: <span style={{ color: "red" }}>*</span>
                        </Text>
                        <Input
                          size="large"
                          value={draft.fob}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              fob: e.target.value,
                            }))
                          }
                          suffix="%"
                        />
                      </Card>
                    ) : null}
                  </Space>
                )}
              </Space>
            ),
          }))}
        />
      </Modal>

      <Modal
        centered
        zIndex={9999}
        open={Boolean(editing) && !editing?.flightLogId}
        onCancel={() => {
          editingRpcRequestRef.current += 1;
          setEditing(null);
        }}
        onOk={() => saveEdit()}
        okButtonProps={{
          disabled: editingReadOnly,
          style: { display: editingReadOnly ? "none" : undefined },
        }}
        title={
          editingCanAccept
            ? "Accept Pre-Flight Inspection"
            : editingReadOnly
              ? "View Entry - Pre-Flight Inspection"
              : "Edit Entry - Pre-Flight Inspection"
        }
        okText="Save"
        cancelText="Close"
        width={isMobile ? "100%" : 1140}
        destroyOnHidden
        styles={{
          body: { maxHeight: "70vh", overflowY: "auto", paddingTop: 12 },
        }}
      >
        {editing && (
          <Space orientation="vertical" style={{ width: "100%" }} size={14}>
            <Text type="secondary">Linked Flight Log: {editing.flightLogControlNo || editing.flightLogId || "Not linked"} · Pilot: {editing.assignedPilot?.name || "Not assigned"} · Mechanic: {editing.assignedMechanic?.name || "Not assigned"}</Text>
            <Row gutter={[10, 10]}>
              <Col xs={24} md={8}>
                <Text
                  strong
                  style={{ display: "block", marginBottom: 6, width: "100%" }}
                >
                  RP/C
                </Text>
                <Select
                  size="large"
                  style={{ width: "100%" }}
                  value={editing.rpc}
                  onChange={handleEditingRpcChange}
                  disabled={editingReadOnly || Boolean(editing.flightLogId)}
                  showSearch={{ optionFilterProp: "label" }}
                  options={rpcDropdownOptions.map((rpc) => ({
                    value: rpc,
                    label: rpc,
                  }))}
                />
              </Col>
              <Col xs={24} md={8}>
                <Text strong style={{ display: "block", marginBottom: 6 }}>
                  Aircraft Type
                </Text>
                <Input
                  size="large"
                  value={editing.aircraftType}
                  disabled={editingReadOnly}
                  readOnly
                />
              </Col>
              <Col xs={24} md={8}>
                <Text strong style={{ display: "block", marginBottom: 6 }}>
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
                  onChange={(date) =>
                    setEditing((prev) => ({
                      ...prev,
                      date: date ? formatDate(date) : "",
                    }))
                  }
                  disabled={editingReadOnly}
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
                <Text strong style={{ display: "block", marginBottom: 6 }}>
                  Fuel On Board <span style={{ color: "red" }}>*</span>
                </Text>
                <Input
                  type="number"
                  size="large"
                  value={editing.fob}
                  onChange={(e) =>
                    setEditing((prev) => ({
                      ...prev,
                      fob: e.target.value,
                    }))
                  }
                  disabled={editingReadOnly}
                  placeholder="Fuel On Board"
                  suffix="%"
                />
              </Col>
            </Row>

            <Divider style={{ margin: "6px 0" }}>Checklist Points</Divider>
            {isB412Aircraft(editing.aircraftType) ? (
              <PreInspectionB412Checklist
                value={editing.b412Data}
                disabled={editingReadOnly}
                onChange={(b412Data) =>
                  setEditing((prev) => ({ ...prev, b412Data }))
                }
              />
            ) : (
              <Row gutter={[8, 8]}>
                {booleanFields.map((field) => (
                  <Col xs={24} md={12} lg={8} key={field}>
                    <Checkbox
                      checked={Boolean(editing[field])}
                      disabled={editingReadOnly}
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
            )}

            <Space style={{ justifyContent: "flex-end", width: "100%" }}>
              {canRelease &&
                editing.status === "pending" &&
                !editing.releasedBy?.name &&
                !editingReadOnly && (
                  <Button type="primary" onClick={requestEditRelease}>
                    Release
                  </Button>
                )}
              {editingCanAccept && (
                <Button type="primary" onClick={requestAccept}>
                  Accept / Complete
                </Button>
              )}
            </Space>
          </Space>
        )}
      </Modal>

      <PinVerifiedSignatureModal
        open={Boolean(signatureMode)}
        title={
          signatureMode === "release" || signatureMode === "create-release"
            ? "Release Pre-Flight Inspection"
            : "Accept Pre-Flight Inspection"
        }
        description={
          signatureMode === "release" || signatureMode === "create-release"
            ? "Draw your release signature."
            : "Draw your acceptance signature."
        }
        confirmDescription="Enter your 6-digit PIN to confirm this signature."
        onCancel={() => setSignatureMode(null)}
        onSave={handleSignedAction}
      />
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
