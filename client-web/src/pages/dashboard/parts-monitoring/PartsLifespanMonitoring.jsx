import React, { useContext, useState, useMemo, useEffect } from "react";
import {
  Row,
  Col,
  Typography,
  Select,
  Button,
  Input,
  Card,
  Form,
  Upload,
  Modal,
  Alert,
  Space,
  Checkbox,
  Table as AntTable,
  Grid,
  Tabs,
  Tag,
} from "antd";
import {
  DownloadOutlined,
  SearchOutlined,
  UploadOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import PMonitoringTable from "../../../components/tables/PMonitoringTable";
import ResultPopup from "../../../components/common/ResultPopup";
import {
  processDataWithFormulas as processAS350,
  getToday,
} from "../../../utils/partsFormula-AS350B3";
import "./PartsLifespanMonitoring.css";
import { message } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { API_BASE } from "../../../utils/API_BASE";
import { AuthContext } from "../../../context/AuthContext";
import { confirmAction } from "../../../utils/confirmAction";
import PinVerifiedSignatureModal from "../../../components/common/PinVerifiedSignatureModal";
import { useSearchParams } from "react-router-dom";

import { rawData as rawData8912 } from "../../../utils/8912RawData";
import { rawData as rawData7247 } from "../../../utils/7247RawData";
import { rawData as rawData7226 } from "../../../utils/7226RawData";
import { rawData as rawData7057 } from "../../../utils/7057RawData";
import { rawData as rawData9511 } from "../../../utils/9511RawData";
//import { rawData as rawData2810 } from "../../../utils/2810RawData"; // Bell 412

// Default reference values for each aircraft from the latest tracking workbooks.
const defaultRefsMap = {
  "RP-C8912": {
    acftTT: 902.1,
    engTT: 902.1,
    n1Cycles: 810,
    n2Cycles: 302,
    landings: 613,
  },
  "RP-C7247": {
    acftTT: 3233.7,
    engTT: 3233.7,
    n1Cycles: 2952.77,
    n2Cycles: 6677.3,
    landings: 3388,
  },
  "RP-C7226": {
    acftTT: 3079.7,
    engTT: 2813.4,
    n1Cycles: 5990.9,
    n2Cycles: 2949.59,
    landings: 3416,
    referenceCells: {
      J2: 498.8,
      N3: 1130.8,
    },
  },
  "RP-C7057": {
    acftTT: 3344.4,
    engTT: 3344.4,
    n1Cycles: 2276.44,
    n2Cycles: 1736.34,
    landings: 4140,
  },
  "RP-C9511": {
    acftTT: 814.5,
    engTT: 372.1,
    n1Cycles: 364.86,
    n2Cycles: 145.87,
    landings: 861,
  },
  //"RP-C2810": { acftTT: 1625.1, n1Cycles: 1655, n2Cycles: 1655, landings: 2243 }, // Bell 412 uses engine cycles instead of N1/N2
};

// Map aircraft registration to its default raw data array
const defaultRawDataMap = {
  "RP-C8912": rawData8912,
  "RP-C7247": rawData7247,
  "RP-C7226": rawData7226,
  "RP-C7057": rawData7057,
  "RP-C9511": rawData9511,
  //"RP-C2810": rawData2810,
};

// Map aircraft to the appropriate formula processor
const getFormulaProcessor = (aircraft) => {
  // Bell 412 (RP-C2810) uses a different processor
  if (aircraft === "RP-C2810") return processAS350;
  // All other AS350B3 variants use the standard processor
  return processAS350;
};

const { Text } = Typography;
const { useBreakpoint } = Grid;
const MOBILE_COMPONENT_PAGE_SIZE = 10;

const exportColumns = [
  {
    title:
      "DUE Indicates Items Due Within 30 Hours, 30 Days, or 30 Cycles/Landings",
    key: "componentName",
    width: 48.5,
  },
  { title: "", key: "hourLimit1", width: 10.1, group: "HOUR/ CYC LIMIT" },
  { title: "H/C/OC", key: "hourLimit2", width: 10.1, group: "HOUR/ CYC LIMIT" },
  { title: "DAY LIMIT", key: "dayLimit", width: 9 },
  { title: "D/OC", key: "dayType", width: 7 },
  { title: "DATE C/W mm/dd/yr", key: "dateCW", width: 13.5 },
  { title: "HRS C/W", key: "hoursCW", width: 10.5 },
  { title: "DAYS REMAINING", key: "daysRemaining", width: 17.5 },
  { title: "TIME/CYC REMAINING", key: "timeRemaining", width: 14 },
  { title: "DATE DUE", key: "dateDue", width: 13 },
  { title: "TT/CYC DUE", key: "ttCycleDue", width: 12 },
  { title: "DUE", key: "due", width: 8 },
  { title: "H/D", key: "hd", width: 8 },
  { title: "TIME SINCE INSTALLATION", key: "timeSinceInstall", width: 22 },
  { title: "TOTAL TIME SINCE NEW", key: "totalTimeSinceNew", width: 18 },
];

const formatDateForExport = (value) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date;
};

const formatPreviewDate = (value) => {
  if (!value) return "Not available";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  });
};

const formatShortDate = (value, fallback = "N/A") => {
  if (!value || value === "N/A") return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  });
};

const toDateInputValue = (value) => {
  if (!value || value === "N/A") return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};

const formatCreepDamage = (value) => {
  if (value === null || value === undefined || value === "") {
    return "Not available";
  }

  const parsed = Number(String(value).replace("%", "").trim());
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return "Not available";
  }

  return `${Number.isInteger(parsed) ? parsed : Math.round(parsed * 100) / 100}%`;
};

const getValidCreepDamageValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const parsed = Number(String(value).replace("%", "").trim());
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return "";
  }

  return Number.isInteger(parsed) ? parsed : Math.round(parsed * 100) / 100;
};

const sanitizeSheetFileName = (value) =>
  String(value || "Parts-Lifespan-Monitoring")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-");

const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const addNgcpLogo = async (workbook, worksheet) => {
  const response = await fetch("/images/ngcp-logo.png");
  if (!response.ok) {
    throw new Error("Unable to load NGCP logo");
  }

  const logoBase64 = await blobToBase64(await response.blob());
  const imageId = workbook.addImage({
    base64: logoBase64,
    extension: "png",
  });

  worksheet.addImage(imageId, {
    tl: { col: 0.15, row: 0.15 },
    ext: { width: 145, height: 56 },
    editAs: "oneCell",
  });
};

const applyCellBorder = (cell) => {
  cell.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
};

const styleHeaderCell = (cell) => {
  cell.font = { bold: true, size: 10 };
  cell.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD9EAD3" },
  };
  applyCellBorder(cell);
};

const isLegendOrNoteRow = (row = {}) => {
  const searchableText = [
    row.componentName,
    row.hourLimit1,
    row.hourLimit2,
    row.hourLimit3,
    row.dayLimit,
    row.dayType,
    row.dateCW,
    row.hoursCW,
    row.daysRemaining,
    row.timeRemaining,
    row.dateDue,
    row.ttCycleDue,
    row.due,
    row.hd,
    row.timeSinceInstall,
    row.totalTimeSinceNew,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  return (
    /^NOTE:?$/.test(searchableText) ||
    searchableText.includes("NOTE:") ||
    searchableText.includes("OC - ON CONDITION") ||
    searchableText.includes("OC-ON CONDITION") ||
    searchableText.includes("OC ON CONDITION") ||
    searchableText.includes("TC - TORQUE CYCLE") ||
    searchableText.includes("TC-TORQUE CYCLE") ||
    searchableText.includes("TC TORQUE CYCLE") ||
    searchableText.includes("T/C - TORQUE CYCLE") ||
    searchableText.includes("T/C TORQUE CYCLE")
  );
};

const removeLegendRows = (rows = []) => {
  const firstLegendIndex = rows.findIndex(isLegendOrNoteRow);
  return firstLegendIndex === -1 ? rows : rows.slice(0, firstLegendIndex);
};

// Column headers (same as before)
const columnHeader = [
  {
    title:
      "DUE Indicates Items Due Within 30 Hours, 30 Days, or 30 Cycles/Landings",
    dataIndex: "componentName",
    key: "componentName",
    width: 300,
  },
  {
    title: "HOUR/ CYC LIMIT",
    children: [
      { title: "", dataIndex: "hourLimit1", key: "hourLimit1", width: 90 },
      {
        title: "H/C/OC",
        dataIndex: "hourLimit2",
        key: "hourLimit2",
        width: 90,
      },
    ],
  },
  { title: "DAY LIMIT", dataIndex: "dayLimit", key: "dayLimit", width: 100 },
  { title: "D/OC", dataIndex: "dayType", key: "dayType", width: 80 },
  {
    title: "DATE C/W mm/dd/yr",
    dataIndex: "dateCW",
    key: "dateCW",
    width: 140,
  },
  { title: "HRS C/W", dataIndex: "hoursCW", key: "hoursCW", width: 100 },
  {
    title: "DAYS REMAINING",
    dataIndex: "daysRemaining",
    key: "daysRemaining",
    width: 130,
  },
  {
    title: "TIME/CYC REMAINING",
    dataIndex: "timeRemaining",
    key: "timeRemaining",
    width: 150,
  },
  { title: "DATE DUE", dataIndex: "dateDue", key: "dateDue", width: 120 },
  {
    title: "TT/CYC DUE",
    dataIndex: "ttCycleDue",
    key: "ttCycleDue",
    width: 120,
  },
  { title: "DUE", dataIndex: "due", key: "due", width: 80 },
  { title: "H/D", dataIndex: "hd", key: "hd", width: 80 },
  {
    title: "TIME SINCE INSTALLATION",
    dataIndex: "timeSinceInstall",
    key: "timeSinceInstall",
    width: 180,
  },
  {
    title: "TOTAL TIME SINCE NEW",
    dataIndex: "totalTimeSinceNew",
    key: "totalTimeSinceNew",
    width: 180,
  },
];

export default function PartsMonitoring() {
  const { user, getAuthHeader } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const screens = useBreakpoint();
  const isMobileLayout = !screens.md;
  const normalizedRole = String(user?.jobTitle || "").toLowerCase();
  const isOfficerInCharge = normalizedRole === "officer-in-charge";
  const canManageAircraft = ["maintenance manager", "superadmin"].includes(
    normalizedRole,
  );
  const [refs, setRefs] = useState({
    today: getToday(),
    acftTT: 0,
    engTT: 0,
    n1Cycles: 0,
    n2Cycles: 0,
    landings: 0,
    referenceCells: {},
  });
  const [rawData, setRawData] = useState([]);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [mobileActiveTab, setMobileActiveTab] = useState("overview");
  const [mobileStatusFilter, setMobileStatusFilter] = useState("all");
  const [mobileComponentPage, setMobileComponentPage] = useState(0);
  const [mobileDetailId, setMobileDetailId] = useState(null);
  const [selectedAircraft, setSelectedAircraft] = useState("");
  const [showComponentsToUpdate, setShowComponentsToUpdate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aircraftOptions, setAircraftOptions] = useState([]);
  const [loadingAircraft, setLoadingAircraft] = useState(false);
  const [importingAircraft, setImportingAircraft] = useState(false);
  const [previewingAircraft, setPreviewingAircraft] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importWarnings, setImportWarnings] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [signatureImportOpen, setSignatureImportOpen] = useState(false);
  const [aircraftDetails, setAircraftDetails] = useState({
    dateManufactured: null,
    aircraftType: "",
    creepDamage: "",
    serialNumber: "",
  });
  const [popup, setPopup] = useState({
    open: false,
    status: "success",
    title: "",
    subTitle: "",
  });

  const showOperationError = (subTitle) => {
    setPopup({
      open: true,
      status: "error",
      title: "Operation failed!",
      subTitle,
    });
  };

  const formattedAircraftOptions = [
    {
      label: "Select aircraft",
      value: "",
      disabled: true,
    },
    ...aircraftOptions.map((aircraft) => ({
      label: aircraft,
      value: aircraft,
    })),
  ];

  // Fetch aircraft list from backend
  const fetchAircraftList = async () => {
    setLoadingAircraft(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/parts-monitoring/aircraft-list`,
      );
      const data = await response.json();
      if (response.ok && data.success) {
        setAircraftOptions(data.data);
      } else {
        showOperationError(data.message || "Failed to load aircraft list");
      }
    } catch (error) {
      console.error("Error fetching aircraft list:", error);
      showOperationError("Error loading aircraft list");
    } finally {
      setLoadingAircraft(false);
    }
  };

  useEffect(() => {
    fetchAircraftList();
  }, []);

  useEffect(() => {
    const aircraftFromNotification =
      searchParams.get("aircraft") || searchParams.get("targetAircraft");

    if (aircraftFromNotification) {
      setSelectedAircraft(aircraftFromNotification);
    }
  }, [searchParams]);

  // Save data to database
  const handleSaveToDatabase = async () => {
    const confirmed = await confirmAction({
      title: "Save Parts Lifespan Data",
      content: `Save current parts lifespan values for ${selectedAircraft || "selected aircraft"}?`,
      okText: "Save",
    });
    if (!confirmed) return;

    setSaving(true);
    try {
      const saveData = {
        aircraft: selectedAircraft,
        referenceData: refs,
        parts: rawData,
        updatedBy: "user",
      };
      const authHeaders = await getAuthHeader();
      const response = await fetch(`${API_BASE}/api/parts-monitoring/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-action-confirmed": "true",
          ...authHeaders,
        },
        body: JSON.stringify({
          ...saveData,
          confirmAction: true,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setPopup({
          open: true,
          status: "success",
          title: "Aircraft data saved",
          subTitle: "The aircraft data has been saved successfully.",
        });
        setLastSaved(new Date());
      } else {
        showOperationError(data.message || "Failed to save data");
      }
    } catch (error) {
      console.error("Error saving data:", error);
      showOperationError("Error saving data to database");
    } finally {
      setSaving(false);
    }
  };

  const resetImportPreview = () => {
    setPendingImportFile(null);
    setImportPreview(null);
    setImportWarnings([]);
    setImportErrors([]);
    setSignatureImportOpen(false);
  };

  const uploadWorkbookForPreview = async (file) => {
    if (!canManageAircraft) {
      showOperationError(
        "Only maintenance managers and superadmins can add aircraft.",
      );
      return Upload.LIST_IGNORE;
    }

    setPreviewingAircraft(true);
    try {
      const formData = new FormData();
      formData.append("workbook", file);

      const authHeaders = await getAuthHeader();
      const response = await fetch(
        `${API_BASE}/api/parts-monitoring/preview-workbook`,
        {
          method: "POST",
          headers: authHeaders,
          body: formData,
        },
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to preview aircraft workbook");
      }

      setPendingImportFile(file);
      setImportPreview(data.data);
      setImportWarnings(data.warnings || []);
      setImportErrors(data.errors || []);
    } catch (error) {
      console.error("Aircraft workbook preview failed:", error);
      showOperationError(
        error.message || "Failed to preview aircraft workbook.",
      );
      resetImportPreview();
    } finally {
      setPreviewingAircraft(false);
    }

    return Upload.LIST_IGNORE;
  };

  const handleImportWorkbook = async (approvalSignature) => {
    if (!pendingImportFile) {
      showOperationError("Select a workbook before adding aircraft.");
      return;
    }

    setImportingAircraft(true);
    try {
      const formData = new FormData();
      formData.append("workbook", pendingImportFile);
      formData.append("approvalSignature", approvalSignature);
      formData.append(
        "updatedBy",
        user
          ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
          : "web user",
      );

      const authHeaders = await getAuthHeader();
      const response = await fetch(
        `${API_BASE}/api/parts-monitoring/import-workbook`,
        {
          method: "POST",
          headers: authHeaders,
          body: formData,
        },
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to import aircraft workbook");
      }
      setPopup({
        open: true,
        status: "success",
        title: "Aircraft data imported",
        subTitle:
          data.message || "The aircraft data has been imported successfully.",
      });
      await fetchAircraftList();
      setSelectedAircraft(data.data.aircraft);
      setLastSaved(new Date());
      resetImportPreview();
    } catch (error) {
      console.error("Aircraft workbook import failed:", error);
      showOperationError(
        error.message || "Failed to import aircraft workbook.",
      );
    } finally {
      setImportingAircraft(false);
    }
  };

  // Load default data for an aircraft (when no saved data exists)
  const loadDefaultData = (aircraft) => {
    const defaultData = defaultRawDataMap[aircraft];
    const defaultRefsValues = defaultRefsMap[aircraft];
    if (defaultData && defaultRefsValues) {
      setRawData(defaultData);
      setRefs({
        today: getToday(),
        acftTT: defaultRefsValues.acftTT,
        engTT: defaultRefsValues.engTT ?? defaultRefsValues.acftTT,
        n1Cycles: defaultRefsValues.n1Cycles,
        n2Cycles: defaultRefsValues.n2Cycles,
        landings: defaultRefsValues.landings,
        referenceCells: defaultRefsValues.referenceCells || {},
      });
      message.info(`Loaded default data for ${aircraft}`);
    } else {
      message.warning(`No default data available for ${aircraft}`);
      setRawData([]);
    }
  };

  // Load data from database or fallback to default
  const loadDataFromDatabase = async (aircraft) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/parts-monitoring/${aircraft}`,
      );
      const data = await response.json();
      if (response.ok && data.success && data.data) {
        const {
          referenceData,
          parts,
          dateManufactured,
          aircraftType,
          creepDamage,
          serialNumber,
        } = data.data;
        setAircraftDetails({
          dateManufactured: dateManufactured
            ? new Date(dateManufactured)
            : null,
          aircraftType: aircraftType || "",
          creepDamage: creepDamage || "",
          serialNumber: serialNumber || "",
        });
        if (referenceData) {
          setRefs({
            today: getToday(),
            acftTT: referenceData.acftTT,
            engTT: referenceData.engTT ?? referenceData.acftTT,
            n1Cycles: referenceData.n1Cycles,
            n2Cycles: referenceData.n2Cycles,
            landings: referenceData.landings,
            referenceCells: referenceData.referenceCells || {},
          });
        }
        if (parts && parts.length > 0) {
          setRawData(parts);
          message.success(`Loaded saved data for ${aircraft}`);
        } else {
          loadDefaultData(aircraft);
        }
      } else if (response.status === 404) {
        loadDefaultData(aircraft);
      } else {
        showOperationError(data.message || "Error loading data");
        loadDefaultData(aircraft);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      showOperationError("Error loading data from database");
      loadDefaultData(aircraft);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAircraft) {
      loadDataFromDatabase(selectedAircraft);
    } else {
      setRawData([]);
      setAircraftDetails({
        dateManufactured: null,
        aircraftType: "",
        creepDamage: "",
        serialNumber: "",
      });
    }
  }, [selectedAircraft]);

  const computedData = useMemo(() => {
    if (!selectedAircraft || rawData.length === 0) return [];
    const processor = getFormulaProcessor(selectedAircraft);
    return removeLegendRows(processor(rawData, refs));
  }, [rawData, refs, selectedAircraft]);

  const filteredData = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return computedData;

    const searchableKeys = [
      "componentName",
      "hourLimit1",
      "hourLimit2",
      "hourLimit3",
      "dayLimit",
      "dayType",
      "dateCW",
      "hoursCW",
      "daysRemaining",
      "timeRemaining",
      "dateDue",
      "ttCycleDue",
      "due",
      "hd",
      "timeSinceInstall",
      "totalTimeSinceNew",
    ];

    return computedData.filter((row) =>
      searchableKeys.some((key) =>
        String(row?.[key] ?? "")
          .toLowerCase()
          .includes(query),
      ),
    );
  }, [computedData, searchText]);

  const componentsToUpdate = useMemo(
    () =>
      computedData
        .filter((row) => {
          if (row.rowType === "header") return false;

          const timeRemaining = Number(row.timeRemaining);
          const daysRemaining = Number(row.daysRemaining);
          const dueByHours =
            row.timeRemaining !== null &&
            row.timeRemaining !== "" &&
            Number.isFinite(timeRemaining) &&
            timeRemaining <= 0;
          const dueByDays =
            row.daysRemaining !== null &&
            row.daysRemaining !== "" &&
            Number.isFinite(daysRemaining) &&
            daysRemaining <= 0;

          return Boolean(row.due) || dueByHours || dueByDays;
        })
        .map((row) => ({
          key: row._id || row.componentName,
          componentName: row.componentName || "Unnamed component",
          timeRemaining: row.timeRemaining,
          daysRemaining: row.daysRemaining,
        })),
    [computedData],
  );

  const getComponentStatus = (row = {}) => {
    const dueText = String(row.due || "").toLowerCase();
    const days = Number(row.daysRemaining);
    const time = Number(row.timeRemaining);

    if (
      dueText.includes("due") ||
      (Number.isFinite(days) && days <= 0) ||
      (Number.isFinite(time) && time <= 0)
    ) {
      return { key: "due", label: "Due", color: "#cf1322" };
    }

    if (
      (Number.isFinite(days) && days <= 30) ||
      (Number.isFinite(time) && time <= 30)
    ) {
      return { key: "dueSoon", label: "Due Soon", color: "#d46b08" };
    }

    return { key: "ok", label: "OK", color: "#26866f" };
  };

  const mobileComponentRows = useMemo(
    () =>
      filteredData.filter(
        (row) => row.rowType !== "header" && row.componentName,
      ),
    [filteredData],
  );

  const mobileSummary = useMemo(
    () =>
      computedData
        .filter((row) => row.rowType !== "header" && row.componentName)
        .reduce(
          (summary, row) => {
            const status = getComponentStatus(row).key;
            summary.total += 1;
            summary[status] += 1;
            return summary;
          },
          { total: 0, due: 0, dueSoon: 0, ok: 0 },
        ),
    [computedData],
  );

  const mobileFilteredRows = useMemo(() => {
    if (mobileStatusFilter === "all") return mobileComponentRows;
    return mobileComponentRows.filter(
      (row) => getComponentStatus(row).key === mobileStatusFilter,
    );
  }, [mobileComponentRows, mobileStatusFilter]);

  const mobileComponentPageCount = Math.max(
    1,
    Math.ceil(mobileFilteredRows.length / MOBILE_COMPONENT_PAGE_SIZE),
  );

  const mobilePaginatedRows = useMemo(
    () =>
      mobileFilteredRows.slice(
        mobileComponentPage * MOBILE_COMPONENT_PAGE_SIZE,
        (mobileComponentPage + 1) * MOBILE_COMPONENT_PAGE_SIZE,
      ),
    [mobileComponentPage, mobileFilteredRows],
  );

  const mobileDetailPart = useMemo(
    () => computedData.find((row) => row._id === mobileDetailId) || null,
    [computedData, mobileDetailId],
  );

  useEffect(() => {
    setMobileComponentPage(0);
    setMobileDetailId(null);
  }, [mobileStatusFilter, searchText, selectedAircraft]);

  const isCellEditable = (record, dataIndex) => {
    if (record.rowType !== "part") return false;
    const nonEditable = [
      "componentName",
      "hourLimit1",
      "hourLimit2",
      "daysRemaining",
      "timeRemaining",
      "dateDue",
      "ttCycleDue",
      "due",
      "dayLimit",
      "dayType",
      "hd",
    ];
    return !nonEditable.includes(dataIndex);
  };

  const handleCellEdit = (recordId, dataIndex, newValue) => {
    setRawData((prev) =>
      prev.map((row) =>
        row._id === recordId ? { ...row, [dataIndex]: newValue } : row,
      ),
    );
  };

  const handleExportExcel = async () => {
    if (!selectedAircraft) {
      message.warning("Select an aircraft before exporting.");
      return;
    }

    if (!computedData.length) {
      message.warning("No parts monitoring rows available to export.");
      return;
    }

    try {
      const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
        import("exceljs"),
        import("file-saver"),
      ]);
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "AirMS";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("STATUS", {
        views: [{ state: "frozen", ySplit: 5 }],
      });

      exportColumns.forEach((column, index) => {
        worksheet.getColumn(index + 1).width = column.width;
      });

      worksheet.mergeCells("A1:B3");
      const logoAreaCell = worksheet.getCell("A1");
      logoAreaCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFFFFF" },
      };
      logoAreaCell.alignment = { horizontal: "center", vertical: "middle" };
      applyCellBorder(logoAreaCell);

      await addNgcpLogo(workbook, worksheet);

      worksheet.mergeCells("C1:F2");
      const titleCell = worksheet.getCell("C1");
      titleCell.value = selectedAircraft;
      titleCell.font = { bold: true, size: 22 };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      titleCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE2F0D9" },
      };
      applyCellBorder(titleCell);

      worksheet.mergeCells("C3:F3");
      const aircraftInfoCell = worksheet.getCell("C3");
      aircraftInfoCell.value = `ACFT. TYPE: ${aircraftDetails.aircraftType || ""}${
        aircraftDetails.serialNumber
          ? `   SN: ${aircraftDetails.serialNumber}`
          : ""
      }`;
      aircraftInfoCell.font = { bold: true, size: 10 };
      aircraftInfoCell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
      aircraftInfoCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE2F0D9" },
      };
      applyCellBorder(aircraftInfoCell);

      worksheet.getCell("G1").value = "Date Manufactured:";
      worksheet.getCell("H1").value = aircraftDetails.dateManufactured || "";
      worksheet.getCell("I1").value = "LANDINGS:";
      worksheet.getCell("J1").value = refs.landings || "";
      worksheet.getCell("K1").value = "DATE:";
      worksheet.getCell("L1").value = refs.today || "";
      worksheet.getCell("G2").value = "ENGINE CYCLE:";
      worksheet.getCell("H2").value = refs.engTT || "";
      worksheet.getCell("I2").value = "ENG. TSO:";
      worksheet.getCell("J2").value = refs.engTT || "";
      worksheet.getCell("K2").value = "ENG. TT:";
      worksheet.getCell("L2").value = refs.engTT || "";
      worksheet.getCell("G3").value = "N1:";
      worksheet.getCell("H3").value = refs.n1Cycles || "";
      worksheet.getCell("I3").value = "N2:";
      worksheet.getCell("J3").value = refs.n2Cycles || "";
      worksheet.getCell("K3").value = "ACFT. TT:";
      worksheet.getCell("L3").value = refs.acftTT || "";
      worksheet.getCell("M3").value = "CREEP DAMAGE:";
      worksheet.getCell("N3").value = getValidCreepDamageValue(
        aircraftDetails.creepDamage,
      );

      ["G1", "I1", "K1", "G2", "I2", "K2", "G3", "I3", "K3", "M3"].forEach(
        (address) => {
          worksheet.getCell(address).font = { bold: true, size: 10 };
          worksheet.getCell(address).alignment = {
            horizontal: "right",
            vertical: "middle",
          };
        },
      );

      ["H1", "L1"].forEach((address) => {
        const cell = worksheet.getCell(address);
        if (cell.value) {
          cell.value = formatDateForExport(cell.value);
          cell.numFmt = "mm/dd/yy";
        }
      });

      worksheet.getRow(4).height = 34;
      worksheet.getRow(5).height = 24;
      worksheet.mergeCells("A4:A5");
      worksheet.mergeCells("B4:C4");
      worksheet.mergeCells("D4:D5");
      worksheet.mergeCells("E4:E5");
      worksheet.mergeCells("F4:F5");
      worksheet.mergeCells("G4:G5");
      worksheet.mergeCells("H4:H5");
      worksheet.mergeCells("I4:I5");
      worksheet.mergeCells("J4:J5");
      worksheet.mergeCells("K4:K5");
      worksheet.mergeCells("L4:L5");
      worksheet.mergeCells("M4:M5");
      worksheet.mergeCells("N4:N5");
      worksheet.mergeCells("O4:O5");

      worksheet.getCell("A4").value = exportColumns[0].title;
      worksheet.getCell("B4").value = "HOUR/ CYC LIMIT";
      worksheet.getCell("B5").value = exportColumns[1].title;
      worksheet.getCell("C5").value = exportColumns[2].title;
      exportColumns.slice(3).forEach((column, index) => {
        worksheet.getCell(4, index + 4).value = column.title;
      });

      for (let rowNumber = 4; rowNumber <= 5; rowNumber += 1) {
        for (
          let columnNumber = 1;
          columnNumber <= exportColumns.length;
          columnNumber += 1
        ) {
          styleHeaderCell(worksheet.getCell(rowNumber, columnNumber));
        }
      }

      const darkGrayColumns = new Set([
        "hourLimit1",
        "hourLimit2",
        "dayType",
        "hoursCW",
        "timeRemaining",
        "ttCycleDue",
      ]);

      computedData.forEach((part) => {
        const row = worksheet.addRow(
          exportColumns.map((column) => {
            if (column.key === "dateCW" || column.key === "dateDue") {
              return formatDateForExport(part[column.key]);
            }
            return part[column.key] ?? "";
          }),
        );

        row.eachCell((cell, columnNumber) => {
          const column = exportColumns[columnNumber - 1];
          cell.alignment = {
            vertical: "middle",
            horizontal: column.key === "componentName" ? "left" : "center",
            wrapText: true,
          };
          cell.font = { size: 9, bold: part.rowType === "header" };
          applyCellBorder(cell);

          if (column.key === "dateCW" || column.key === "dateDue") {
            cell.numFmt = "mm/dd/yy";
          }

          if (part.rowType === "header") {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFB6D7A8" },
            };
            return;
          }

          if (darkGrayColumns.has(column.key)) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF0F0F0" },
            };
          }

          const daysRemaining = Number(part.daysRemaining);
          if (
            (column.key === "daysRemaining" || column.key === "due") &&
            Number.isFinite(daysRemaining)
          ) {
            if (daysRemaining <= 0) {
              cell.font = {
                ...cell.font,
                bold: true,
                color: { argb: "FFFF0000" },
              };
            } else if (daysRemaining <= 30) {
              cell.font = {
                ...cell.font,
                bold: true,
                color: { argb: "FFFF9900" },
              };
            }
          }
        });
      });

      worksheet.autoFilter = {
        from: { row: 5, column: 1 },
        to: { row: 5, column: exportColumns.length },
      };

      worksheet.pageSetup = {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      saveAs(
        blob,
        `${sanitizeSheetFileName(selectedAircraft)}-Parts-Lifespan-Monitoring.xlsx`,
      );
      setPopup({
        open: true,
        status: "success",
        title: "Aircraft data exported",
        subTitle: "The aircraft data has been exported successfully.",
      });
    } catch (error) {
      setPopup({
        open: true,
        status: "error",
        title: "Aircraft data export failed",
        subTitle: error.message || "The aircraft data export failed.",
      });
      console.error("Parts lifespan export failed:", error);
    }
  };

  const referenceDateValue =
    refs.today instanceof Date && !Number.isNaN(refs.today.getTime())
      ? refs.today.toISOString().split("T")[0]
      : "";
  const referenceFields = [
    ["engTT", "Engine Cycle"],
    ["today", "Date"],
    ["n1Cycles", "N1"],
    ["n2Cycles", "N2"],
    ["acftTT", "Acft. TT"],
    ["landings", "Landings"],
  ];
  const filterOptions = [
    ["all", "All", mobileSummary.total, "#26866f"],
    ["due", "Due", mobileSummary.due, "#cf1322"],
    ["dueSoon", "Due Soon", mobileSummary.dueSoon, "#d46b08"],
    ["ok", "OK", mobileSummary.ok, "#26866f"],
  ];
  const renderMobileReferenceFields = () => (
    <Form layout="vertical" colon={false}>
      <Row gutter={[12, 8]}>
        {referenceFields.map(([key, label]) => (
          <Col xs={24} sm={12} key={key}>
            <Form.Item label={label} style={{ marginBottom: 8 }}>
              <Input
                size="large"
                type={key === "today" ? "date" : "number"}
                step="0.01"
                inputMode={key === "today" ? undefined : "decimal"}
                value={key === "today" ? referenceDateValue : refs[key]}
                onChange={(e) =>
                  setRefs((prev) => ({
                    ...prev,
                    [key]:
                      key === "today"
                        ? new Date(e.target.value)
                        : parseFloat(e.target.value) || 0,
                  }))
                }
                disabled={!selectedAircraft || isOfficerInCharge}
              />
            </Form.Item>
          </Col>
        ))}
      </Row>
    </Form>
  );

  if (isMobileLayout) {
    return (
      <div className="parts-monitoring-container parts-monitoring-mobile">
        <Card className="mobile-control-card">
          <Space direction="vertical" size={10} style={{ width: "100%" }}>
            <Select
              value={selectedAircraft}
              onChange={(value) => setSelectedAircraft(value)}
              loading={loadingAircraft}
              placeholder="Select aircraft"
              options={formattedAircraftOptions}
              size="large"
              style={{ width: "100%" }}
            />
            <Input
              placeholder="Search components"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              size="large"
            />
          </Space>
        </Card>

        <Tabs
          className="mobile-parts-tabs"
          activeKey={mobileActiveTab}
          onChange={setMobileActiveTab}
          items={[
            {
              key: "overview",
              label: "Overview",
              children: (
                <Space direction="vertical" size={10} style={{ width: "100%" }}>
                  <Card className="mobile-aircraft-summary">
                    <Space
                      direction="vertical"
                      size={8}
                      style={{ width: "100%" }}
                    >
                      <div className="mobile-aircraft-title">
                        {selectedAircraft || "Select an aircraft"}
                      </div>
                      <div className="mobile-info-row">
                        <Text type="secondary">Type</Text>
                        <Text strong>
                          {aircraftDetails.aircraftType || "Not available"}
                        </Text>
                      </div>
                      <div className="mobile-info-row">
                        <Text type="secondary">Serial Number</Text>
                        <Text strong>
                          {aircraftDetails.serialNumber || "Not available"}
                        </Text>
                      </div>
                      <div className="mobile-info-row">
                        <Text type="secondary">Date Manufactured</Text>
                        <Text strong>
                          {formatShortDate(
                            aircraftDetails.dateManufactured,
                            "Not available",
                          )}
                        </Text>
                      </div>
                      <div className="mobile-info-row">
                        <Text type="secondary">Creep Damage</Text>
                        <Text strong>
                          {formatCreepDamage(aircraftDetails.creepDamage)}
                        </Text>
                      </div>
                    </Space>
                  </Card>
                  <div className="mobile-summary-grid">
                    {filterOptions.map(([key, label, value, color]) => (
                      <button
                        type="button"
                        key={key}
                        className="mobile-summary-chip"
                        onClick={() => {
                          setMobileStatusFilter(key);
                          setMobileActiveTab("components");
                        }}
                      >
                        <span style={{ color }}>{value}</span>
                        <small>{label}</small>
                      </button>
                    ))}
                  </div>
                </Space>
              ),
            },
            {
              key: "components",
              label: "Components",
              children: (
                <Space direction="vertical" size={10} style={{ width: "100%" }}>
                  <div className="mobile-filter-row">
                    {filterOptions.map(([key, label, value, color]) => (
                      <button
                        type="button"
                        key={key}
                        className={
                          mobileStatusFilter === key
                            ? "mobile-filter-chip active"
                            : "mobile-filter-chip"
                        }
                        onClick={() => setMobileStatusFilter(key)}
                      >
                        <span>{label}</span>
                        <b style={{ color }}>{value}</b>
                      </button>
                    ))}
                  </div>
                  {loading && <Card loading />}
                  {!loading && !selectedAircraft && (
                    <Card>
                      <Text type="secondary">
                        Select an aircraft to view components.
                      </Text>
                    </Card>
                  )}
                  {!loading &&
                    selectedAircraft &&
                    mobileFilteredRows.length === 0 && (
                      <Card>
                        <Text type="secondary">No component rows found.</Text>
                      </Card>
                    )}
                  {!loading &&
                    selectedAircraft &&
                    mobileFilteredRows.length > 0 && (
                      <Text className="mobile-page-summary" type="secondary">
                        Showing{" "}
                        {mobileComponentPage * MOBILE_COMPONENT_PAGE_SIZE + 1}-
                        {Math.min(
                          (mobileComponentPage + 1) *
                            MOBILE_COMPONENT_PAGE_SIZE,
                          mobileFilteredRows.length,
                        )}{" "}
                        of {mobileFilteredRows.length}
                      </Text>
                    )}
                  {mobilePaginatedRows.map((part) => {
                    const status = getComponentStatus(part);
                    return (
                      <button
                        type="button"
                        key={part._id || part.componentName}
                        className="mobile-component-card"
                        onClick={() => setMobileDetailId(part._id)}
                      >
                        <div className="mobile-component-card-head">
                          <strong>
                            {part.componentName || "Unnamed component"}
                          </strong>
                          <Tag color={status.color}>{status.label}</Tag>
                        </div>
                        <div className="mobile-component-metrics">
                          <span>
                            <small>Days</small>
                            <b>{part.daysRemaining ?? "N/A"}</b>
                          </span>
                          <span>
                            <small>Time/Cyc</small>
                            <b>{part.timeRemaining ?? "N/A"}</b>
                          </span>
                          <span>
                            <small>Date Due</small>
                            <b>{formatShortDate(part.dateDue)}</b>
                          </span>
                        </div>
                      </button>
                    );
                  })}
                  {mobileFilteredRows.length > MOBILE_COMPONENT_PAGE_SIZE && (
                    <div className="mobile-pagination-row">
                      <Button
                        block
                        disabled={mobileComponentPage === 0}
                        onClick={() =>
                          setMobileComponentPage((page) =>
                            Math.max(0, page - 1),
                          )
                        }
                      >
                        Previous
                      </Button>
                      <div className="mobile-page-counter">
                        {mobileComponentPage + 1}/{mobileComponentPageCount}
                      </div>
                      <Button
                        block
                        disabled={
                          mobileComponentPage >= mobileComponentPageCount - 1
                        }
                        onClick={() =>
                          setMobileComponentPage((page) =>
                            Math.min(mobileComponentPageCount - 1, page + 1),
                          )
                        }
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </Space>
              ),
            },
            {
              key: "reference",
              label: "Reference",
              children: (
                <Space direction="vertical" size={10} style={{ width: "100%" }}>
                  <Card className="aircraft-card">
                    {renderMobileReferenceFields()}
                  </Card>
                  <Space
                    direction="vertical"
                    size={8}
                    style={{ width: "100%" }}
                  >
                    {!isOfficerInCharge && (
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={handleSaveToDatabase}
                        loading={saving}
                        disabled={!selectedAircraft}
                        block
                        size="large"
                      >
                        Save to Database
                      </Button>
                    )}
                    {canManageAircraft && (
                      <Upload
                        accept=".xlsx,.xlsm"
                        beforeUpload={uploadWorkbookForPreview}
                        showUploadList={false}
                        disabled={previewingAircraft || importingAircraft}
                      >
                        <Button
                          icon={<PlusOutlined />}
                          loading={previewingAircraft || importingAircraft}
                          block
                          size="large"
                        >
                          Add Aircraft
                        </Button>
                      </Upload>
                    )}
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={handleExportExcel}
                      disabled={
                        !selectedAircraft ||
                        loading ||
                        computedData.length === 0
                      }
                      block
                      size="large"
                    >
                      Export
                    </Button>
                    {lastSaved && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Last saved: {lastSaved.toLocaleTimeString()}
                      </Text>
                    )}
                  </Space>
                </Space>
              ),
            },
          ]}
        />

        <Modal
          open={Boolean(mobileDetailPart)}
          title={mobileDetailPart?.componentName || "Component Details"}
          onCancel={() => setMobileDetailId(null)}
          footer={null}
          className="mobile-component-detail-modal"
          wrapClassName="mobile-component-detail-modal-wrap"
          destroyOnHidden
        >
          {mobileDetailPart && (
            <Space direction="vertical" size={10} style={{ width: "100%" }}>
              <Tag color={getComponentStatus(mobileDetailPart).color}>
                {getComponentStatus(mobileDetailPart).label}
              </Tag>
              <Row gutter={[10, 8]}>
                {[
                  ["hourLimit1", "Hour Limit"],
                  ["hourLimit2", "H/C/OC"],
                  ["dayLimit", "Day Limit"],
                  ["dayType", "D/OC"],
                  ["ttCycleDue", "TT/CYC Due"],
                  ["hd", "H/D"],
                ].map(([key, label]) => (
                  <Col xs={12} key={key}>
                    <Text type="secondary">{label}</Text>
                    <div className="mobile-detail-value">
                      {mobileDetailPart[key] || "N/A"}
                    </div>
                  </Col>
                ))}
              </Row>
              <Form layout="vertical">
                {[
                  ["hoursCW", "HRS C/W", "text"],
                  ["dateCW", "Date C/W", "date"],
                  ["timeSinceInstall", "Time Since Installation", "text"],
                  ["totalTimeSinceNew", "Total Time Since New", "text"],
                ].map(([key, label, type]) => (
                  <Form.Item key={key} label={label}>
                    <Input
                      type={type}
                      value={
                        type === "date"
                          ? toDateInputValue(mobileDetailPart[key])
                          : mobileDetailPart[key] || ""
                      }
                      disabled={
                        !selectedAircraft ||
                        isOfficerInCharge ||
                        !isCellEditable(mobileDetailPart, key)
                      }
                      onChange={(e) =>
                        handleCellEdit(
                          mobileDetailPart._id,
                          key,
                          e.target.value,
                        )
                      }
                    />
                  </Form.Item>
                ))}
                <Row gutter={[10, 8]}>
                  <Col xs={12}>
                    <Text type="secondary">Days Remaining</Text>
                    <div className="mobile-detail-value">
                      {mobileDetailPart.daysRemaining ?? "N/A"}
                    </div>
                  </Col>
                  <Col xs={12}>
                    <Text type="secondary">Time/Cyc Remaining</Text>
                    <div className="mobile-detail-value">
                      {mobileDetailPart.timeRemaining ?? "N/A"}
                    </div>
                  </Col>
                  <Col xs={12}>
                    <Text type="secondary">Date Due</Text>
                    <div className="mobile-detail-value">
                      {formatShortDate(mobileDetailPart.dateDue)}
                    </div>
                  </Col>
                  <Col xs={12}>
                    <Text type="secondary">Due</Text>
                    <div className="mobile-detail-value">
                      {mobileDetailPart.due || "N/A"}
                    </div>
                  </Col>
                </Row>
              </Form>
            </Space>
          )}
        </Modal>

        <Modal
          open={Boolean(importPreview)}
          title="Preview Aircraft Import"
          onCancel={resetImportPreview}
          onOk={() => setSignatureImportOpen(true)}
          okText="Confirm and Sign"
          cancelText="Discard"
          okButtonProps={{
            disabled: importErrors.length > 0 || importingAircraft,
          }}
          confirmLoading={importingAircraft}
          width="94vw"
          centered
          destroyOnHidden
        >
          {importErrors.map((error) => (
            <Alert
              key={error}
              type="error"
              title={error}
              showIcon
              style={{ marginBottom: 8 }}
            />
          ))}
          {importWarnings.map((warning) => (
            <Alert
              key={warning}
              type="warning"
              title={warning}
              showIcon
              style={{ marginBottom: 8 }}
            />
          ))}
          {importPreview && (
            <AntTable
              size="small"
              bordered
              scroll={{ x: 1500, y: 360 }}
              pagination={false}
              rowKey={(row) => row._id || row.componentName}
              rowClassName={(record) =>
                record.rowType === "header" ? "preview-import-header-row" : ""
              }
              dataSource={importPreview.parts || []}
              columns={columnHeader}
            />
          )}
        </Modal>
        <PinVerifiedSignatureModal
          open={signatureImportOpen}
          title="Sign Aircraft Import"
          description={`Draw your signature to add ${importPreview?.aircraft || "this aircraft"} to parts lifespan monitoring.`}
          confirmDescription="Enter your 6-digit PIN to confirm this aircraft import."
          onCancel={() => setSignatureImportOpen(false)}
          onSave={handleImportWorkbook}
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

  return (
    <div className="parts-monitoring-container">
      {" "}
      <Card style={{ marginBottom: 10 }}>
        <Row justify="space-between" align="middle">
          <Col flex="auto">
            <div className="header-left">
              <Input
                placeholder="Search components, "
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="search-input"
                allowClear
              />
              <Select
                value={selectedAircraft}
                onChange={(value) => setSelectedAircraft(value)}
                style={{ width: 220 }}
                loading={loadingAircraft}
                placeholder="Select aircraft"
                options={formattedAircraftOptions}
              />
              {!isOfficerInCharge && (
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSaveToDatabase}
                  loading={saving}
                  disabled={!selectedAircraft}
                  style={{ backgroundColor: "#52c41a", borderColor: "#52c41a" }}
                >
                  Save to Database
                </Button>
              )}
              {canManageAircraft && (
                <Upload
                  accept=".xlsx,.xlsm"
                  beforeUpload={uploadWorkbookForPreview}
                  showUploadList={false}
                  disabled={previewingAircraft || importingAircraft}
                >
                  <Button
                    icon={<PlusOutlined />}
                    loading={previewingAircraft || importingAircraft}
                  >
                    Add Aircraft
                  </Button>
                </Upload>
              )}
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExportExcel}
                disabled={
                  !selectedAircraft || loading || computedData.length === 0
                }
              >
                Export
              </Button>
              {lastSaved && (
                <Text
                  type="secondary"
                  style={{ fontSize: "12px", marginLeft: "8px" }}
                >
                  Last saved: {lastSaved.toLocaleTimeString()}
                </Text>
              )}
            </div>
          </Col>
        </Row>
      </Card>
      <Card className="aircraft-card legend-card">
        <Space orientation="vertical" size="small" style={{ width: "100%" }}>
          <Text strong>NOTE:</Text>

          <Row gutter={[16, 12]}>
            <Col xs={24} sm={12} md={6}>
              <Space>
                <Text strong>OC</Text>
                <Text>- ON CONDITION</Text>
              </Space>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Space>
                <Text strong>H</Text>
                <Text>- HOURS</Text>
              </Space>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Space>
                <Text strong>D</Text>
                <Text>- DAY</Text>
              </Space>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Space>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    background: "#ff4d4f",
                    borderRadius: 2,
                    display: "inline-block",
                  }}
                />
                <Text>REMOVED</Text>
              </Space>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Space>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    background: "#52c41a",
                    borderRadius: 2,
                    display: "inline-block",
                  }}
                />
                <Text>INSTALLED</Text>
              </Space>
            </Col>
          </Row>
        </Space>
      </Card>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={24} md={8}>
          <Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text>Aircraft:</Text>
                <Text className="info-value">
                  {selectedAircraft || "Not selected"}
                </Text>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text>Date Manufactured:</Text>
                <Text className="info-value">
                  {aircraftDetails.dateManufactured
                    ? formatShortDate(aircraftDetails.dateManufactured)
                    : "Not available"}
                </Text>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text>Acft. Type:</Text>
                <Text className="info-value">
                  {aircraftDetails.aircraftType || "Not available"}
                </Text>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text>Creep Damage:</Text>
                <Text className="info-value">
                  {formatCreepDamage(aircraftDetails.creepDamage)}
                </Text>
              </div>
            </div>
          </Card>
        </Col>

        {/* Right Card - Inputs */}
        <Col sm={24} md={16}>
          <Card className="aircraft-card">
            <Form layout="vertical" colon={false}>
              <Row gutter={[12, 12]}>
                {/* Engine Cycle */}
                <Col xs={24} sm={12} md={6}>
                  <Form.Item label="Engine Cycle" style={{ marginBottom: 8 }}>
                    <Input
                      size="middle"
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={refs.engTT}
                      onChange={(e) =>
                        setRefs((prev) => ({
                          ...prev,
                          engTT: parseFloat(e.target.value) || 0,
                        }))
                      }
                      disabled={!selectedAircraft || isOfficerInCharge}
                    />
                  </Form.Item>
                </Col>

                {/* Date */}
                <Col xs={24} sm={12} md={6}>
                  <Form.Item label="Date" style={{ marginBottom: 8 }}>
                    <Input
                      size="middle"
                      type="date"
                      value={refs.today.toISOString().split("T")[0]}
                      onChange={(e) =>
                        setRefs((prev) => ({
                          ...prev,
                          today: new Date(e.target.value),
                        }))
                      }
                      disabled={!selectedAircraft || isOfficerInCharge}
                    />
                  </Form.Item>
                </Col>

                {/* N1 */}
                <Col xs={24} sm={12} md={6}>
                  <Form.Item label="N1" style={{ marginBottom: 8 }}>
                    <Input
                      size="middle"
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={refs.n1Cycles}
                      onChange={(e) =>
                        setRefs((prev) => ({
                          ...prev,
                          n1Cycles: parseFloat(e.target.value) || 0,
                        }))
                      }
                      disabled={!selectedAircraft || isOfficerInCharge}
                    />
                  </Form.Item>
                </Col>

                {/* N2 */}
                <Col xs={24} sm={12} md={6}>
                  <Form.Item label="N2" style={{ marginBottom: 8 }}>
                    <Input
                      size="middle"
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={refs.n2Cycles}
                      onChange={(e) =>
                        setRefs((prev) => ({
                          ...prev,
                          n2Cycles: parseFloat(e.target.value) || 0,
                        }))
                      }
                      disabled={!selectedAircraft || isOfficerInCharge}
                    />
                  </Form.Item>
                </Col>

                {/* Aircraft TT */}
                <Col xs={24} sm={12} md={6}>
                  <Form.Item label="Acft. TT" style={{ marginBottom: 8 }}>
                    <Input
                      size="middle"
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={refs.acftTT}
                      onChange={(e) =>
                        setRefs((prev) => ({
                          ...prev,
                          acftTT: parseFloat(e.target.value) || 0,
                        }))
                      }
                      disabled={!selectedAircraft || isOfficerInCharge}
                    />
                  </Form.Item>
                </Col>

                {/* Landings */}
                <Col xs={24} sm={12} md={6}>
                  <Form.Item label="Landings" style={{ marginBottom: 8 }}>
                    <Input
                      size="middle"
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={refs.landings}
                      onChange={(e) =>
                        setRefs((prev) => ({
                          ...prev,
                          landings: parseFloat(e.target.value) || 0,
                        }))
                      }
                      disabled={!selectedAircraft || isOfficerInCharge}
                    />
                  </Form.Item>
                </Col>

                {/* Sling */}
                <Col xs={24} sm={12} md={6}>
                  <Form.Item label="Sling" style={{ marginBottom: 8 }}>
                    <Input
                      size="middle"
                      disabled={!selectedAircraft || isOfficerInCharge}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>
      </Row>
      {/* <div style={{ marginBottom: 16 }}>
        <Checkbox
          checked={showComponentsToUpdate}
          onChange={() => setShowComponentsToUpdate((current) => !current)}
        >
          {showComponentsToUpdate
            ? "Hide Components to Update"
            : "Show Components to Update"}
        </Checkbox>
      </div>
      {showComponentsToUpdate && (
        <Card
          className="aircraft-card"
          title="Components to Update"
          size="small"
          style={{ marginBottom: 16 }}
        >
          {componentsToUpdate.length ? (
            <Row gutter={[12, 8]}>
              {componentsToUpdate.map((item) => (
                <Col xs={24} sm={12} lg={8} key={item.key}>
                  <Checkbox checked disabled>
                    <Space size={6} wrap>
                      <Text strong>{item.componentName}</Text>
                      {item.timeRemaining !== "" &&
                        item.timeRemaining !== null && (
                          <Text type="secondary">{item.timeRemaining} FH</Text>
                        )}
                      {item.daysRemaining !== "" &&
                        item.daysRemaining !== null && (
                          <Text type="secondary">
                            {item.daysRemaining} day(s)
                          </Text>
                        )}
                    </Space>
                  </Checkbox>
                </Col>
              ))}
            </Row>
          ) : (
            <Text type="secondary">
              No components are currently marked for update.
            </Text>
          )}
        </Card>
      )} */}
      <PMonitoringTable
        headers={columnHeader}
        data={filteredData}
        loading={loading}
        editable={!!selectedAircraft && !isOfficerInCharge}
        isCellEditable={isCellEditable}
        onCellEdit={handleCellEdit}
        rowKey="_id"
        scroll={{ x: 1500 }}
      />
      <Modal
        open={Boolean(importPreview)}
        title="Preview Aircraft Import"
        onCancel={resetImportPreview}
        onOk={() => setSignatureImportOpen(true)}
        okText="Confirm and Sign"
        cancelText="Discard"
        okButtonProps={{
          disabled: importErrors.length > 0 || importingAircraft,
        }}
        confirmLoading={importingAircraft}
        width="92vw"
        centered
        destroyOnHidden
      >
        {importErrors.map((error) => (
          <Alert
            key={error}
            type="error"
            title={error}
            showIcon
            style={{ marginBottom: 8 }}
          />
        ))}
        {importWarnings.map((warning) => (
          <Alert
            key={warning}
            type="warning"
            title={warning}
            showIcon
            style={{ marginBottom: 8 }}
          />
        ))}
        {importPreview && (
          <>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={24} md={6}>
                <Card>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <Text>Aircraft:</Text>
                      <Text className="info-value">
                        {importPreview.aircraft || "N/A"}
                      </Text>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <Text>Date Manufactured:</Text>
                      <Text className="info-value">
                        {formatPreviewDate(importPreview.dateManufactured)}
                      </Text>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <Text>Acft. Type:</Text>
                      <Text className="info-value">
                        {importPreview.aircraftType || "Not available"}
                        {importPreview.serialNumber
                          ? ` SN: ${importPreview.serialNumber}`
                          : ""}
                      </Text>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <Text>Creep Damage:</Text>
                      <Text className="info-value">
                        {formatCreepDamage(importPreview.creepDamage)}
                      </Text>
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={24} md={18}>
                <Card className="aircraft-card">
                  <Form layout="vertical" colon={false}>
                    <Row gutter={[12, 6]}>
                      {[
                        ["engTT", "Engine Cycle"],
                        ["today", "Date"],
                        ["n1Cycles", "N1"],
                        ["n2Cycles", "N2"],
                        ["acftTT", "Acft. TT"],
                        ["landings", "Landings"],
                      ].map(([key, label]) => (
                        <Col xs={24} sm={12} md={6} key={key}>
                          <Form.Item label={label} style={{ marginBottom: 8 }}>
                            <Input
                              size="middle"
                              value={
                                key === "today"
                                  ? formatPreviewDate(
                                      importPreview.referenceData?.[key],
                                    )
                                  : (importPreview.referenceData?.[key] ?? "")
                              }
                              readOnly
                            />
                          </Form.Item>
                        </Col>
                      ))}
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item label="Sling" style={{ marginBottom: 8 }}>
                          <Input size="middle" readOnly />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>
                </Card>
              </Col>
            </Row>

            <AntTable
              size="small"
              bordered
              sticky
              scroll={{ x: 1500, y: 420 }}
              pagination={{
                pageSize: 15,
                showSizeChanger: true,
                pageSizeOptions: ["15", "30", "50"],
              }}
              rowKey={(row) => row._id || row.componentName}
              rowClassName={(record) =>
                record.rowType === "header" ? "preview-import-header-row" : ""
              }
              dataSource={importPreview.parts || []}
              columns={columnHeader}
            />
          </>
        )}
      </Modal>
      <PinVerifiedSignatureModal
        open={signatureImportOpen}
        title="Sign Aircraft Import"
        description={`Draw your signature to add ${importPreview?.aircraft || "this aircraft"} to parts lifespan monitoring.`}
        confirmDescription="Enter your 6-digit PIN to confirm this aircraft import."
        onCancel={() => setSignatureImportOpen(false)}
        onSave={handleImportWorkbook}
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
