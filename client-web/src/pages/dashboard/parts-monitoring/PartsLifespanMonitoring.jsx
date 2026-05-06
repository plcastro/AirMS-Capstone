import React, { useContext, useState, useMemo, useEffect } from "react";
import {
  Row,
  Col,
  Typography,
  Select,
  Button,
  Input,
  Card,
  Divider,
  Form,
} from "antd";
import { DownloadOutlined, SearchOutlined } from "@ant-design/icons";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import PMonitoringTable from "../../../components/tables/PMonitoringTable";

import {
  processDataWithFormulas as processAS350,
  getToday,
} from "../../../utils/partsFormula-AS350B3";
import "./PartsLifespanMonitoring.css";
import { message } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { API_BASE } from "../../../utils/API_BASE";
import { AuthContext } from "../../../context/AuthContext";

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
  const { user } = useContext(AuthContext);
  const isOfficerInCharge =
    user?.jobTitle?.toLowerCase() === "officer-in-charge";
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
  const [selectedAircraft, setSelectedAircraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [aircraftOptions, setAircraftOptions] = useState([]);
  const [loadingAircraft, setLoadingAircraft] = useState(false);
  const [aircraftDetails, setAircraftDetails] = useState({
    dateManufactured: null,
    aircraftType: "",
    creepDamage: "",
    serialNumber: "",
  });
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
        message.error(data.message || "Failed to load aircraft list");
      }
    } catch (error) {
      console.error("Error fetching aircraft list:", error);
      message.error("Error loading aircraft list");
    } finally {
      setLoadingAircraft(false);
    }
  };

  useEffect(() => {
    fetchAircraftList();
  }, []);

  // Save data to database
  const handleSaveToDatabase = async () => {
    setSaving(true);
    try {
      const saveData = {
        aircraft: selectedAircraft,
        referenceData: refs,
        parts: rawData,
        updatedBy: "user",
      };
      const response = await fetch(`${API_BASE}/api/parts-monitoring/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saveData),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        message.success("Data saved successfully!");
        setLastSaved(new Date());
      } else {
        message.error(data.message || "Failed to save data");
      }
    } catch (error) {
      console.error("Error saving data:", error);
      message.error("Error saving data to database");
    } finally {
      setSaving(false);
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
        message.error(data.message || "Error loading data");
        loadDefaultData(aircraft);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      message.error("Error loading data from database");
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
        aircraftDetails.serialNumber ? `   SN: ${aircraftDetails.serialNumber}` : ""
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
      worksheet.getCell("N3").value = aircraftDetails.creepDamage || "";

      ["G1", "I1", "K1", "G2", "I2", "K2", "G3", "I3", "K3"].forEach(
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
        for (let columnNumber = 1; columnNumber <= exportColumns.length; columnNumber += 1) {
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
              cell.font = { ...cell.font, bold: true, color: { argb: "FFFF0000" } };
            } else if (daysRemaining <= 30) {
              cell.font = { ...cell.font, bold: true, color: { argb: "FFFF9900" } };
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
      message.success("Parts lifespan monitoring exported successfully.");
    } catch (error) {
      console.error("Parts lifespan export failed:", error);
      message.error(`Export failed: ${error.message}`);
    }
  };

  return (
    <div className="parts-monitoring-container">
      {" "}
      <Card style={{ marginBottom: 10 }}>
        <Row justify="space-between" align="middle" className="header-row">
          <Col flex="auto">
            <div className="header-left">
              <Input
                placeholder="Search..."
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
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExportExcel}
                disabled={!selectedAircraft || loading || computedData.length === 0}
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
        </Row>{" "}
      </Card>
      <Divider />
      <Row gutter={[16, 16]} style={{ marginBottom: "16px" }}>
        <Col sm={24} md={6}>
          <Card className="aircraft-card">
            <div>
              <Text>Aircraft: </Text>
              <Text className="info-value">
                {selectedAircraft || "Not selected"}
              </Text>
            </div>

            <div>
              <Text>Date Manufactured: </Text>
              <Text className="info-value">
                {aircraftDetails.dateManufactured
                  ? aircraftDetails.dateManufactured.toLocaleDateString()
                  : "Not available"}
              </Text>
            </div>

            <div>
              <Text>Acft. Type: </Text>
              <Text className="info-value">
                {aircraftDetails.aircraftType || "Not available"}
              </Text>
            </div>

            <div>
              <Text>Creep Damage: </Text>
              <Text className="info-value">
                {aircraftDetails.creepDamage
                  ? `${aircraftDetails.creepDamage}%`
                  : "Not available"}
              </Text>
            </div>
          </Card>
        </Col>

        {/* Right Card - Inputs */}
        <Col xs={24} md={18}>
          <Card className="aircraft-card">
            <Form layout="vertical" colon={false}>
              <Row gutter={[16, 8]}>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Engine Cycle">
                    <Input
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
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Date">
                    <Input
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
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="N1">
                    <Input
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
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Eng. TT">
                    <Input
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
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="N2">
                    <Input
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
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Acft. TT">
                    <Input
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
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Landings">
                    <Input
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
                <Col xs={24} sm={12} md={8}>
                  <Form.Item label="Sling">
                    <Input disabled={!selectedAircraft || isOfficerInCharge} />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>
      </Row>
      <PMonitoringTable
        headers={columnHeader}
        data={computedData}
        loading={loading}
        editable={!!selectedAircraft && !isOfficerInCharge}
        isCellEditable={isCellEditable}
        onCellEdit={handleCellEdit}
        rowKey="_id"
        scroll={{ x: 1500 }}
      />
    </div>
  );
}
