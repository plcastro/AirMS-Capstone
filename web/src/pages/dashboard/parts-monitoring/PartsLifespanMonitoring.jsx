import React, { useState, useMemo, useEffect } from "react";
import {
  Row,
  Col,
  Typography,
  Select,
  Button,
  Input,
  Card,
  Divider,
  message,
} from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import PMonitoringTable from "../../../components/tables/PMonitoringTable";
import {
  processDataWithFormulas,
  getToday,
} from "../../../utils/partsFormula-AS350B3";
import "./PartsLifespanMonitoring.css";

import { SaveOutlined } from "@ant-design/icons";
import { API_BASE } from "../../../utils/API_BASE";

const { Text } = Typography;

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

// =========================================================================
// Main component
// =========================================================================
export default function PartsLifespanMonitoring() {
  // Reference values (editable by user)
  const [refs, setRefs] = useState({
    today: getToday(),
    acftTT: 902.1,
    n1Cycles: 810,
    n2Cycles: 302,
    landings: 613,
  });

  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [selectedAircraft, setSelectedAircraft] = useState("");
  const [, setLoading] = useState(false);
  const [aircraftOptions, setAircraftOptions] = useState([]);
  const [loadingAircraft, setLoadingAircraft] = useState(false);
  const [aircraftDetails, setAircraftDetails] = useState({
    dateManufactured: null,
    aircraftType: "",
    creepDamage: "",
    serialNumber: "",
  });

  const formatDate = (dateString) => {
    if (!dateString || dateString === "N/A") return dateString;

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      const year = date.getFullYear().toString().slice(-2);

      return `${day}/${month}/${year}`;
    } catch (error) {
      return dateString;
    }
  };

  const fetchAircraftList = async () => {
    setLoadingAircraft(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/parts-monitoring/aircraft-list`,
      );
      const data = await response.json();

      if (response.ok && data.success) {
        setAircraftOptions(data.data);

        console.log("Fetched data: ", data.data);
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

  // Save function using fetch
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
        headers: {
          "Content-Type": "application/json",
        },
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

  // Load data function using fetch
  const loadDataFromDatabase = async (aircraft) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/parts-monitoring/${aircraft}`,
      );
      const data = await response.json();

      console.log("Fetched data for aircraft:", data);

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
          const currentDate = new Date();
          setRefs({
            today: currentDate,
            acftTT: referenceData.acftTT,
            n1Cycles: referenceData.n1Cycles,
            n2Cycles: referenceData.n2Cycles,
            landings: referenceData.landings,
          });
        }

        if (parts && parts.length > 0) {
          setRawData(parts);
          message.success(`Loaded data for ${aircraft}`);
        }
      } else if (response.status === 404) {
        message.info(`No saved data found for ${aircraft}`);
      } else {
        message.error(data.message || "Error loading data");
      }
    } catch (error) {
      console.error("Error loading data:", error);
      message.error("Error loading data from database");
    } finally {
      setLoading(false);
    }
  };

  // Load data when aircraft changes
  useEffect(() => {
    if (selectedAircraft) {
      loadDataFromDatabase(selectedAircraft);
    }
  }, [selectedAircraft]);

  const [rawData, setRawData] = useState([
    // Row 6 - AIRWORTHINES CERTIFICATE
    {
      _id: "6",
      rowType: "part",
      componentName: "AIRWORTHINES CERTIFICATE",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "365",
      dayType: "D",
      dateCW: "2024-11-05",
      hoursCW: "",
      daysRemaining: "=K6-$L$1",
      timeRemaining: "",
      dateDue: "=G6+E6",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 7 - REGISTRATION CERTIFICATE
    {
      _id: "7",
      rowType: "part",
      componentName: "REGISTRATION CERTIFICATE",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "365",
      dayType: "D",
      dateCW: "2025-10-10",
      hoursCW: "",
      daysRemaining: "=K7-$L$1",
      timeRemaining: "",
      dateDue: "2028-10-10",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 8 - RADIO LICENSE
    {
      _id: "8",
      rowType: "part",
      componentName: "RADIO LICENSE",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "365",
      dayType: "D",
      dateCW: "2025-02-26",
      hoursCW: "",
      daysRemaining: "=K8-$L$1",
      timeRemaining: "",
      dateDue: "2028-10-11",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 9 - WEIGHT & BALANCE
    {
      _id: "9",
      rowType: "part",
      componentName: "WEIGHT & BALANCE",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "1825",
      dayType: "D",
      dateCW: "2021-09-21",
      hoursCW: "",
      daysRemaining: "=K9-$L$1",
      timeRemaining: "",
      dateDue: "=G9+E9",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 10 - FIRST AID KIT
    {
      _id: "10",
      rowType: "part",
      componentName: "FIRST AID KIT PN:8095X900 SN:M2X-P4-6S",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "730",
      dayType: "D",
      dateCW: "2025-10-01",
      hoursCW: "",
      daysRemaining: "=K10-$L$1",
      timeRemaining: "",
      dateDue: "=G10+E10",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 11 - HAND FIRE EXTINGUISHER
    {
      _id: "11",
      rowType: "part",
      componentName:
        "HAND FIRE EXTINGUISHER BOTTLE PN:S262A10T1001 SN:ACW04964",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "3650",
      dayType: "D",
      dateCW: "2023-08-18",
      hoursCW: "",
      daysRemaining: "=K11-$L$1",
      timeRemaining: "",
      dateDue: "=G11+E11",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 12 - TRANSPONDER CHECK
    {
      _id: "12",
      rowType: "part",
      componentName: "TRANSPONDER CHECK",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "365",
      dayType: "D",
      dateCW: "2025-05-05",
      hoursCW: "",
      daysRemaining: "=K12-$L$1",
      timeRemaining: "",
      dateDue: "=G12+E12",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 13 - ELT check
    {
      _id: "13",
      rowType: "part",
      componentName: "ELT check",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "365",
      dayType: "D",
      dateCW: "2025-10-05",
      hoursCW: "",
      daysRemaining: "=K13-$L$1",
      timeRemaining: "",
      dateDue: "=G13+E13",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 14 - ELT BATTERY
    {
      _id: "14",
      rowType: "part",
      componentName: "ELT BATTERY PN: 704A45737078 SN:LX1101457711",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "2190",
      dayType: "D",
      dateCW: "2024-10-05",
      hoursCW: "",
      daysRemaining: "=K14-$L$1",
      timeRemaining: "",
      dateDue: "=E14+G14",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 15 - PITOT static check
    {
      _id: "15",
      rowType: "part",
      componentName: "PITOT static check",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "730",
      dayType: "D",
      dateCW: "2025-10-05",
      hoursCW: "",
      daysRemaining: "=K15-$L$1",
      timeRemaining: "",
      dateDue: "=G15+E15",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 16-18 - blank rows (skip)

    // Row 19 - NEXT 10 HRS. INSPECTION
    {
      _id: "19",
      rowType: "part",
      componentName: "NEXT 10 HRS. INSPECTION",
      hourLimit1: "10",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "D",
      dateCW: "2025-10-26",
      hoursCW: "148.5",
      daysRemaining: "",
      timeRemaining: "114.9",
      dateDue: "",
      ttCycleDue: "158.5",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 20 - NEXT 150 HRS. INSPECTION
    {
      _id: "20",
      rowType: "part",
      componentName: "NEXT 150 HRS. INSPECTION",
      hourLimit1: "150",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "D",
      dateCW: "2025-10-11",
      hoursCW: "148.5",
      daysRemaining: "",
      timeRemaining: "114.9",
      dateDue: "",
      ttCycleDue: "=C20+H20",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 21 - 150 HRS / 12 M
    {
      _id: "21",
      rowType: "part",
      componentName: "150 HRS / 12 M",
      hourLimit1: "150",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "365",
      dayType: "D",
      dateCW: "2024-07-28",
      hoursCW: "150",
      daysRemaining: "=K21-$L$1",
      timeRemaining: "",
      dateDue: "2026-10-26",
      ttCycleDue: "=C21+H21",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 22 - 12M INSPECTION
    {
      _id: "22",
      rowType: "part",
      componentName: "12M INSPECTION",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "365",
      dayType: "D",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "=K22-$L$1",
      timeRemaining: "",
      dateDue: "2026-10-26",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 23 - HMU
    {
      _id: "23",
      rowType: "part",
      componentName:
        "HMU(PUMP AND METERING VALVE ADJ.ASSY PN:0292862200 SN:51687",
      hourLimit1: "4000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "3650",
      dayType: "D",
      dateCW: "2023-09-01",
      hoursCW: "",
      daysRemaining: "=K23-$L$1",
      timeRemaining: "=L23-$L$3-409",
      dateDue: "=G23+E23",
      ttCycleDue: "=C23+H23",
      due: '=IF(J23<=50,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 24 - 600HRS
    {
      _id: "24",
      rowType: "part",
      componentName: "600HRS",
      hourLimit1: "600",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "",
      hoursCW: "600",
      daysRemaining: "",
      timeRemaining: "=L24-$L$3",
      dateDue: "2026-01-11",
      ttCycleDue: "=C24+H24",
      due: '=IF(J24<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 25 - 600HRS / 24M
    {
      _id: "25",
      rowType: "part",
      componentName: "600HRS / 24M",
      hourLimit1: "600",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "730",
      dayType: "D",
      dateCW: "",
      hoursCW: "600",
      daysRemaining: "=K25-$L$1",
      timeRemaining: "=L25-$L$3",
      dateDue: "2026-12-30",
      ttCycleDue: "=C25+H25",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 26 - 1200HRS
    {
      _id: "26",
      rowType: "part",
      componentName: "1200HRS",
      hourLimit1: "1200",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "1460",
      dayType: "",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "=K26-$L$1",
      timeRemaining: "=L26-$L$3",
      dateDue: "2026-12-18",
      ttCycleDue: "=C26+H26",
      due: '=IF(J26<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 27 - 1200HRS / 48M
    {
      _id: "27",
      rowType: "part",
      componentName: "1200HRS / 48M",
      hourLimit1: "1200",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "1460",
      dayType: "D",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "=K27-$L$1",
      timeRemaining: "=L27-$L$3",
      dateDue: "2026-12-18",
      ttCycleDue: "=C27+H27",
      due: '=IF(J27<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 28 - 5000HRS / 144M
    {
      _id: "28",
      rowType: "part",
      componentName: "5000HRS / 144M",
      hourLimit1: "5000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "4380",
      dayType: "D",
      dateCW: "",
      hoursCW: "0",
      daysRemaining: "=K28-$L$1",
      timeRemaining: "=L28-$L$3",
      dateDue: "2034-12-18",
      ttCycleDue: "=C28+H28",
      due: '=IF(J28<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 29 - Engine Fuel Filter
    {
      _id: "29",
      rowType: "part",
      componentName: "Engine Fuel Filter P/N:",
      hourLimit1: "600",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "D",
      dateCW: "2020-05-26",
      hoursCW: "600",
      daysRemaining: "",
      timeRemaining: "=L29-$L$3",
      dateDue: "",
      ttCycleDue: "=C29+H29",
      due: '=IF(J29<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 30 - Engine Oil Filter
    {
      _id: "30",
      rowType: "part",
      componentName: "Engine Oil Filter P/N:",
      hourLimit1: "800",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "D",
      dateCW: "",
      hoursCW: "800",
      daysRemaining: "",
      timeRemaining: "=L30-$L$3",
      dateDue: "",
      ttCycleDue: "=C30+H30",
      due: '=IF(J30<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 31 - MGB Oil Filter
    {
      _id: "31",
      rowType: "part",
      componentName: "MGB Oil Filter P/N:",
      hourLimit1: "600",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "730",
      dayType: "D",
      dateCW: "",
      hoursCW: "800",
      daysRemaining: "=K31-$L$1",
      timeRemaining: "=L31-$L$3",
      dateDue: "2026-12-18",
      ttCycleDue: "=C31+H31",
      due: '=IF(J31<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "( Margin 73D)",
    },

    // Row 32 - Hydraulic Filter
    {
      _id: "32",
      rowType: "part",
      componentName: "Hydraulic Filter P/N:",
      hourLimit1: "2500",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "1460",
      dayType: "D",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "=K32-$L$1",
      timeRemaining: "=L32-$L$3",
      dateDue: "2026-12-18",
      ttCycleDue: "=C32+H32",
      due: '=IF(J32<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 33 - HYDRAULIC FLUID CHANGE
    {
      _id: "33",
      rowType: "part",
      componentName: "HYDRAULIC FLUID CHANGE",
      hourLimit1: "",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "D",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "( Margin 73D)",
    },

    // Row 34 - SLING
    {
      _id: "34",
      rowType: "part",
      componentName: "SLING",
      hourLimit1: "",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "365",
      dayType: "D",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "=K34-$L$1",
      timeRemaining: "",
      dateDue: "2026-12-18",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 35 - TRDS BEARING
    {
      _id: "35",
      rowType: "part",
      componentName: "TRDS BEARING PN:  (60 MONTHS)",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "1825",
      dayType: "D",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "=K35-$L$1",
      timeRemaining: "",
      dateDue: "2026-12-18",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 36 - HYD PUMP Drive Brg.
    {
      _id: "36",
      rowType: "part",
      componentName: "HYD PUMP Drive Brg. P/N:  (72 MONTHS)",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "2190",
      dayType: "D",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "=K36-$L$1",
      timeRemaining: "",
      dateDue: "2026-12-18",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 37 - ENGINE BORESCOPE INSP.
    {
      _id: "37",
      rowType: "part",
      componentName: "ENGINE BORESCOPE INSP.",
      hourLimit1: "800",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "D",
      dateCW: "",
      hoursCW: "800",
      daysRemaining: "",
      timeRemaining: "=L37-$L$3",
      dateDue: "",
      ttCycleDue: "=C37+H37",
      due: '=IF(J37<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 38 - AIRFRAME COMPONENT (Header)
    {
      _id: "38",
      rowType: "header",
      componentName: "AIRFRAME COMPONENT",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 39 - Electrical Power System (Header)
    {
      _id: "39",
      rowType: "header",
      componentName: "Electrical Power System",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 40 - Saft Battery
    {
      _id: "40",
      rowType: "part",
      componentName: "Saft Battery (Ni-Cad) PN:151CH1 SN:202002871",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "OC",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 41 - Saft Battery Top Charge
    {
      _id: "41",
      rowType: "part",
      componentName:
        "Saft Battery (Ni-Cad) PN:151CH1 SN:202002871   Top Charge",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "91",
      dayType: "D",
      dateCW: "2022-03-21",
      hoursCW: "",
      daysRemaining: "=K41-$L$1",
      timeRemaining: "",
      dateDue: "2026-10-11",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 42 - Fire Protection (Header)
    {
      _id: "42",
      rowType: "header",
      componentName: "Fire Protection",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 43 - Cabin Fire Extinguisher
    {
      _id: "43",
      rowType: "part",
      componentName: "Cabin Fire Extinguisher PN:S26A10T1001 SN:ACW04964",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "3650",
      dayType: "D",
      dateCW: "2020-08-18",
      hoursCW: "",
      daysRemaining: "=K43-$L$1",
      timeRemaining: "",
      dateDue: "=G43+E43",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 44 - Cabin Fire Extinguisher Re-weigh
    {
      _id: "44",
      rowType: "part",
      componentName: "Cabin Fire Extinguisher  Re-weigh",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "30",
      dayType: "",
      dateCW: "2022-03-26",
      hoursCW: "",
      daysRemaining: "=K44-$L$1",
      timeRemaining: "",
      dateDue: "2026-10-11",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 45 - Floats of Emergency Flotation System (Header)
    {
      _id: "45",
      rowType: "header",
      componentName: "Floats of Emergency Flotation System",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 46 - Emergency Floats (LH)
    {
      _id: "46",
      rowType: "part",
      componentName: "Emergency Floats (LH)  MPN:200733-0 SN:3332",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "3650",
      dayType: "D",
      dateCW: "2020-11-01",
      hoursCW: "",
      daysRemaining: "=K46-$L$1",
      timeRemaining: "",
      dateDue: "=G46+E46",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 47 - Emergency Floats (RH)
    {
      _id: "47",
      rowType: "part",
      componentName: "Emergency Floats (RH)  MPN:200734-0 SN:3339",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "3650",
      dayType: "D",
      dateCW: "2020-11-01",
      hoursCW: "",
      daysRemaining: "=K47-$L$1",
      timeRemaining: "",
      dateDue: "=G47+E47",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 48 - Emergency Floats Gear CYLINDER ASSY SN:5485
    {
      _id: "48",
      rowType: "part",
      componentName: "Emergency Floats Gear CYLINDER ASSY PN:200740-2 SN:5485",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "5475",
      dayType: "D",
      dateCW: "2020-07-27",
      hoursCW: "",
      daysRemaining: "=K48-$L$1",
      timeRemaining: "",
      dateDue: "=G48+E48",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 49 - Emergency Floats Gear CYLINDER ASSY SN:5441
    {
      _id: "49",
      rowType: "part",
      componentName: "Emergency Floats Gear CYLINDER ASSY PN:200740-2 SN:5441",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "5475",
      dayType: "D",
      dateCW: "2020-07-27",
      hoursCW: "",
      daysRemaining: "=K49-$L$1",
      timeRemaining: "",
      dateDue: "=G49+E49",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 50 - Hydrotest Floats Gear Cylinder 5485
    {
      _id: "50",
      rowType: "part",
      componentName: "Hydrotest Floats Gear Cylinder 200740-2 SN:5485",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "1825",
      dayType: "D",
      dateCW: "2020-07-27",
      hoursCW: "",
      daysRemaining: "=K50-$L$1",
      timeRemaining: "",
      dateDue: "=G50+E50",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 51 - Hydrotest Floats Gear Cylinder 5441
    {
      _id: "51",
      rowType: "part",
      componentName: "Hydrotest Floats Gear Cylinder  PN:200740-2 SN:5441",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "1825",
      dayType: "D",
      dateCW: "2020-07-27",
      hoursCW: "",
      daysRemaining: "=K51-$L$1",
      timeRemaining: "",
      dateDue: "=G51+E51",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 52 - Onboard Systems
    {
      _id: "52",
      rowType: "part",
      componentName: "Onboard  Systems  PN:   SN: TSI:",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "1825",
      dayType: "D",
      dateCW: "N/A",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 53 - Onboard Systems
    {
      _id: "53",
      rowType: "part",
      componentName: "Onboard  Systems  PN:   SN:",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "3650",
      dayType: "D",
      dateCW: "N/A",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 54 - Main Rotor Blade (Header)
    {
      _id: "54",
      rowType: "header",
      componentName: "Main Rotor Blade",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 55 - Main Rotor Blade RED
    {
      _id: "55",
      rowType: "part",
      componentName: "Main Rotor Blade PN:355A11-0030-04  SN:48420    RED",
      hourLimit1: "20000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2026-08-09",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L55-$L$3",
      dateDue: "",
      ttCycleDue: "=C55+H55",
      due: '=IF(J55<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 56 - Main Rotor Blade BLUE
    {
      _id: "56",
      rowType: "part",
      componentName: "Main Rotor Blade PN:355A11-0030-04  SN:48684   BLUE",
      hourLimit1: "20000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2026-08-09",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L56-$L$3",
      dateDue: "",
      ttCycleDue: "=C56+H56",
      due: '=IF(J56<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 57 - Main Rotor Blade YELLOW
    {
      _id: "57",
      rowType: "part",
      componentName: "Main Rotor Blade PN:355A11-0030-04  SN:48777 YELLOW",
      hourLimit1: "20000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2026-08-09",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L57-$L$3",
      dateDue: "",
      ttCycleDue: "=C57+H57",
      due: '=IF(J57<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 58 - Poly-Urethane Tape (MRB) (Header)
    {
      _id: "58",
      rowType: "header",
      componentName: "Poly-Urethane Tape (MRB)",
      hourLimit1: "OC",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 59 - Main Rotor Head (Header)
    {
      _id: "59",
      rowType: "header",
      componentName: "Main Rotor Head  PN:355A31000202 SN:M5812",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-07-02",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 60-65 - Starflex Main Blade Pin MHR (multiple rows with similar patterns)
    {
      _id: "60",
      rowType: "part",
      componentName: "Starflex Main Blade Pin MHR PN:350A31-3020-20 SN:M9029",
      hourLimit1: "INF",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-07-02",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },
    {
      _id: "61",
      rowType: "part",
      componentName: "Starflex Main Blade Pin MHR PN:350A31-3020-20 SN:M9053",
      hourLimit1: "INF",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-07-02",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },
    {
      _id: "62",
      rowType: "part",
      componentName: "Starflex Main Blade Pin MHR PN:350A31-3020-20 SN:M9056",
      hourLimit1: "INF",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-07-02",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },
    {
      _id: "63",
      rowType: "part",
      componentName: "Starflex Main Blade Pin MHR PN:350A31-3020-20 SN:M9090",
      hourLimit1: "INF",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-07-02",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },
    {
      _id: "64",
      rowType: "part",
      componentName: "Starflex Main Blade Pin MHR PN:350A31-3020-20 SN:M9157",
      hourLimit1: "INF",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-07-02",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },
    {
      _id: "65",
      rowType: "part",
      componentName: "Starflex Main Blade Pin MHR PN:350A31-3020-20 SN:M9169",
      hourLimit1: "INF",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-07-02",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 66-68 - Flange,Sleeve Lower
    {
      _id: "66",
      rowType: "part",
      componentName: "Flange,Sleeve Lower  PN:350A31-1850-02 SN:M51730",
      hourLimit1: "6600",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-07-02",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L66-$L$3",
      dateDue: "",
      ttCycleDue: "=C66+H66",
      due: '=IF(J66<=360,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },
    {
      _id: "67",
      rowType: "part",
      componentName: "Flange,Sleeve Lower  PN:350A31-1850-02 SN:M51735",
      hourLimit1: "6600",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-07-02",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L67-$L$3",
      dateDue: "",
      ttCycleDue: "=C67+H67",
      due: '=IF(J67<=360,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },
    {
      _id: "68",
      rowType: "part",
      componentName: "Flange,Sleeve Lower  PN:350A31-1850-02 SN:M51765",
      hourLimit1: "6600",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-07-02",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L68-$L$3",
      dateDue: "",
      ttCycleDue: "=C68+H68",
      due: '=IF(J68<=360,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 69-71 - Flange,Sleeve Upper
    {
      _id: "69",
      rowType: "part",
      componentName: "Flange,Sleeve Upper PN:350A31-1850-03 SN:M51394",
      hourLimit1: "6600",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-07-02",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L69-$L$3",
      dateDue: "",
      ttCycleDue: "=C69+H69",
      due: '=IF(J69<=360,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },
    {
      _id: "70",
      rowType: "part",
      componentName: "Flange,Sleeve Upper PN:350A31-1850-03 SN:M51663",
      hourLimit1: "6600",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-07-02",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L70-$L$3",
      dateDue: "",
      ttCycleDue: "=C70+H70",
      due: '=IF(J70<=360,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },
    {
      _id: "71",
      rowType: "part",
      componentName: "Flange,Sleeve Upper PN:350A31-1850-03 SN:M5898",
      hourLimit1: "6600",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-07-02",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L71-$L$3",
      dateDue: "",
      ttCycleDue: "=C71+H71",
      due: '=IF(J71<=360,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 72-77 - Spherical Thrust Bearing Bolt
    {
      _id: "72",
      rowType: "part",
      componentName:
        "Spherical Thrust Bearing Bolt (SCREW) PN:350A31-1854-21 SN:86019",
      hourLimit1: "3000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-07-02",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L72-$L$3",
      dateDue: "",
      ttCycleDue: "=C72+H72",
      due: '=IF(J72<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },
    {
      _id: "73",
      rowType: "part",
      componentName:
        "Spherical Thrust Bearing Bolt (SCREW) PN:350A31-1854-21 SN:86020",
      hourLimit1: "3000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-07-02",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L73-$L$3",
      dateDue: "",
      ttCycleDue: "=C73+H73",
      due: '=IF(J73<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },
    {
      _id: "74",
      rowType: "part",
      componentName:
        "Spherical Thrust Bearing Bolt (SCREW) PN:350A31-1854-21 SN:86034",
      hourLimit1: "3000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-07-02",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L74-$L$3",
      dateDue: "",
      ttCycleDue: "=C74+H74",
      due: '=IF(J74<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },
    {
      _id: "75",
      rowType: "part",
      componentName:
        "Spherical Thrust Bearing Bolt (SCREW) PN:350A31-1854-21 SN:86037",
      hourLimit1: "3000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-07-02",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L75-$L$3",
      dateDue: "",
      ttCycleDue: "=C75+H75",
      due: '=IF(J75<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },
    {
      _id: "76",
      rowType: "part",
      componentName:
        "Spherical Thrust Bearing Bolt (SCREW) PN:350A31-1854-21 SN:86046",
      hourLimit1: "3000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-07-02",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L76-$L$3",
      dateDue: "",
      ttCycleDue: "=C76+H76",
      due: '=IF(J76<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },
    {
      _id: "77",
      rowType: "part",
      componentName:
        "Spherical Thrust Bearing Bolt (SCREW) PN:350A31-1854-21 SN:86073",
      hourLimit1: "3000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-07-02",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L77-$L$3",
      dateDue: "",
      ttCycleDue: "=C77+H77",
      due: '=IF(J77<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 78-80 - Horn, Pitch
    {
      _id: "78",
      rowType: "part",
      componentName: "Horn, Pitch PN:350A31-1877-03 SN:MAP13911",
      hourLimit1: "80000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-07-02",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L78-$L$3",
      dateDue: "",
      ttCycleDue: "=C78+H78",
      due: '=IF(J78<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },
    {
      _id: "79",
      rowType: "part",
      componentName: "Horn, Pitch PN:350A31-1877-03 SN:MAP13924",
      hourLimit1: "80000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-07-02",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L79-$L$3",
      dateDue: "",
      ttCycleDue: "=C79+H79",
      due: '=IF(J79<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },
    {
      _id: "80",
      rowType: "part",
      componentName: "Horn, Pitch PN:350A31-1877-03 SN:MAP13807",
      hourLimit1: "80000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-07-02",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L80-$L$3",
      dateDue: "",
      ttCycleDue: "=C80+H80",
      due: '=IF(J80<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 81 - StarFlex STAR 26 FLODS M42
    {
      _id: "81",
      rowType: "part",
      componentName: "(StarFlex STAR 26 FLODS M42)PN:350A31-1918-00 SR:M8121",
      hourLimit1: "3000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-07-02",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L81-$L$3",
      dateDue: "",
      ttCycleDue: "=C81+H81",
      due: '=IF(J81<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 82-84 - Thrust Bearing Spherical
    {
      _id: "82",
      rowType: "part",
      componentName: "Thrust Bearing Spherical PN:704A33633208 SN:LK27366",
      hourLimit1: "6400",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-07-02",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L82-$L$3",
      dateDue: "",
      ttCycleDue: "=C82+H82",
      due: '=IF(J82<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },
    {
      _id: "83",
      rowType: "part",
      componentName: "Thrust Bearing Spherical  PN:704A33633208 SN:LK27373",
      hourLimit1: "6400",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-07-02",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L83-$L$3",
      dateDue: "",
      ttCycleDue: "=C83+H83",
      due: '=IF(J83<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },
    {
      _id: "84",
      rowType: "part",
      componentName: "Thrust Bearing Spherical  PN:704A33633208 SN:LK27398",
      hourLimit1: "6400",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-07-02",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L84-$L$3",
      dateDue: "",
      ttCycleDue: "=C84+H84",
      due: '=IF(J84<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 85 - Main Rotor Shaft (Header)
    {
      _id: "85",
      rowType: "header",
      componentName: "Main Rotor Shaft",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 86 - Main Rotor Shaft
    {
      _id: "86",
      rowType: "part",
      componentName: "Main Rotor Shaft PN:355A37-0006-01M SN:M2055",
      hourLimit1: "90000",
      hourLimit2: "TC",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-06-25",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L86-$L$3",
      dateDue: "",
      ttCycleDue: "=C86+H86",
      due: '=IF(J86<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 87-98 - MRH Attachment Bolt (SCREW)
    ...Array.from({ length: 12 }, (_, i) => ({
      _id: String(87 + i),
      rowType: "part",
      componentName: `MRH Attachment Bolt (SCREW) PN:350A37-1245-20 SN:${[121090, 121094, 121166, 121466, 121485, 121532, 132207, 132208, 132209, 132210, 132230, 132236][i]}`,
      hourLimit1: "3000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-06-25",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: `=L${87 + i}-$L$3`,
      dateDue: "",
      ttCycleDue: `=C${87 + i}+H${87 + i}`,
      due: `=IF(J${87 + i}<=30,"DUE","")`,
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    })),

    // Row 99 - Swashplate
    {
      _id: "99",
      rowType: "part",
      componentName: "Swashplate (Bearing EXTERNAL) PN:704A33653110 SN:NR8290",
      hourLimit1: "4800",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-06-25",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L99-$L$3",
      dateDue: "",
      ttCycleDue: "=C99+H99",
      due: '=IF(J99<=365,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 100 - Main Gear Box TBO (Header)
    {
      _id: "100",
      rowType: "header",
      componentName: "Main Gear Box TBO",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 101 - FUEL PUMP (Header)
    {
      _id: "101",
      rowType: "header",
      componentName: "FUEL PUMP",
      hourLimit1: "OC",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 102 - TRANSMISSION OIL CHANGE
    {
      _id: "102",
      rowType: "part",
      componentName: "TRANSMISSION OIL CHANGE",
      hourLimit1: "600",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "",
      hoursCW: "600",
      daysRemaining: "",
      timeRemaining: "=L102-$L$3",
      dateDue: "",
      ttCycleDue: "=C102+H102",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 103 - Epicyclic Reduction Gear
    {
      _id: "103",
      rowType: "part",
      componentName: "Epicyclic Reduction Gear PN:350A32-0120-01 SN:M10337",
      hourLimit1: "600",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-06-26",
      hoursCW: "600",
      daysRemaining: "",
      timeRemaining: "=L103-$L$3",
      dateDue: "",
      ttCycleDue: "=C103+H103",
      due: '=IF(J103<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 104 - Conic Pinion
    {
      _id: "104",
      rowType: "part",
      componentName:
        "Conic Pinion (FIXED RING LLI)  PN:350A32-1119-20 SN:L10254",
      hourLimit1: "3000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-06-26",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L104-$L$3",
      dateDue: "",
      ttCycleDue: "=C104+H104",
      due: '=IF(J104<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 105 - PLANET GEAR, NITRIDED
    {
      _id: "105",
      rowType: "part",
      componentName: "(PLANET GEAR, NITRIDED) PN:350A32-1075-20 SN:L11674",
      hourLimit1: "20000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-06-26",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L105-$L$3",
      dateDue: "",
      ttCycleDue: "=C105+H105",
      due: '=IF(J105<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 106 - MOUNT,Planet Gear,4 CONTACTS
    {
      _id: "106",
      rowType: "part",
      componentName:
        "MOUNT,Planet Gear,4 CONTACTS PN:350A32-1089-21 SN:CUR03665",
      hourLimit1: "49000",
      hourLimit2: "TC",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-06-26",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L106-$L$3",
      dateDue: "",
      ttCycleDue: "=C106+H106",
      due: '=IF(J106<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 107 - Planet Gear Assy L42826
    {
      _id: "107",
      rowType: "part",
      componentName: "Planet Gear Assy PN:350A32-1082-03 SN: L42826",
      hourLimit1: "20000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-06-26",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "19819.9",
      dateDue: "",
      ttCycleDue: "20000",
      due: '=IF(J107<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 108 - Planet Gear Assy L43437
    {
      _id: "108",
      rowType: "part",
      componentName: "Planet Gear Assy PN:350A32-1082-03 SN:L43437",
      hourLimit1: "20000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-06-26",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L108-$L$3",
      dateDue: "",
      ttCycleDue: "=C108+H108",
      due: '=IF(J108<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 109 - Planet Gear Assy L43478
    {
      _id: "109",
      rowType: "part",
      componentName: "Planet Gear Assy PN:350A32-1082-03 SN:L43478",
      hourLimit1: "20000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-06-26",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L109-$L$3",
      dateDue: "",
      ttCycleDue: "=C109+H109",
      due: '=IF(J109<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 110 - Planet Gear Assy L43552
    {
      _id: "110",
      rowType: "part",
      componentName: "Planet Gear Assy PN:350A32-1082-03 SN:L43552",
      hourLimit1: "20000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-06-26",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L110-$L$3",
      dateDue: "",
      ttCycleDue: "=C110+H110",
      due: '=IF(J110<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 111 - Planet Gear Assy L4364
    {
      _id: "111",
      rowType: "part",
      componentName: "Planet Gear Assy PN:350A32-1082-03 SN:L4364",
      hourLimit1: "20000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-06-26",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L111-$L$3",
      dateDue: "",
      ttCycleDue: "=C111+H111",
      due: '=IF(J111<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 112 - Oil Pump Assy
    {
      _id: "112",
      rowType: "part",
      componentName: "Oil Pump Assy. PN:350A32-0400-00 SN:M6728",
      hourLimit1: "3500",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-07-03",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L112-$L$3",
      dateDue: "",
      ttCycleDue: "=C112+H112",
      due: '=IF(J112<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 113 - Blank row (Header)
    {
      _id: "113",
      rowType: "header",
      componentName: "",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 114 - REDUCTION GEAR TAPERED ASSY
    {
      _id: "114",
      rowType: "part",
      componentName: "REDUCTION GEAR TAPERED ASSY PN:350A32-0350-02 SN:M6459",
      hourLimit1: "3000",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-07-01",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L114-$L$3",
      dateDue: "",
      ttCycleDue: "=C114+H114",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 115 - Casing ASSY,LOWER
    {
      _id: "115",
      rowType: "part",
      componentName: "Casing ASSY,LOWER PN:350A32-3119-05 SN:MAP10463",
      hourLimit1: "20000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-07-01",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L115-$L$3",
      dateDue: "",
      ttCycleDue: "=C115+H115",
      due: '=IF(J115<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 116 - MAIN HOUSING DOUBLE HYD
    {
      _id: "116",
      rowType: "part",
      componentName: "MAIN HOUSING DOUBLE HYD PN:350A32-3191-00 SN:MAP585",
      hourLimit1: "89800",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-07-01",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L116-$L$3",
      dateDue: "",
      ttCycleDue: "=C116+H116",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 117 - BEVEL GEAR
    {
      _id: "117",
      rowType: "part",
      componentName: "BEVEL GEAR PN:350A32-3173-20 SN:L6508",
      hourLimit1: "20000",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-07-01",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L117-$L$3",
      dateDue: "",
      ttCycleDue: "=C117+H117",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 118 - BEVEL WHEEL
    {
      _id: "118",
      rowType: "part",
      componentName: "BEVEL WHEEL PN:350A32-3166-20 SN:L5815",
      hourLimit1: "20000",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-07-01",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L118-$L$3",
      dateDue: "",
      ttCycleDue: "=C118+H118",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 119 - Tail Rotor Blades (Header)
    {
      _id: "119",
      rowType: "header",
      componentName: "Tail Rotor Blades",
      hourLimit1: "",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 120 - Tail Rotor Blade
    {
      _id: "120",
      rowType: "part",
      componentName: "Tail Rotor Blade PN:355A12006004 SN:24559",
      hourLimit1: "4000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-09-14",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "=C120-P120",
      dateDue: "",
      ttCycleDue: "=C120-H120",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 121 - Poly-Urethane Tapes (Header)
    {
      _id: "121",
      rowType: "header",
      componentName: "Poly-Urethane Tapes",
      hourLimit1: "OC",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 122 - HANGER BEARING (Header)
    {
      _id: "122",
      rowType: "header",
      componentName: "HANGER BEARING",
      hourLimit1: "",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 123 - SPLIT BUSHING (Header)
    {
      _id: "123",
      rowType: "header",
      componentName: "SPLIT BUSHING",
      hourLimit1: "",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 124 - Tail Rotor Gear Box (Header)
    {
      _id: "124",
      rowType: "header",
      componentName: "Tail Rotor Gear Box",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 125 - TAIL GEARBOX OIL CHANGE
    {
      _id: "125",
      rowType: "part",
      componentName: "TAIL GEARBOX OIL CHANGE",
      hourLimit1: "",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 126 - Tail Rotor Gear Box
    {
      _id: "126",
      rowType: "part",
      componentName: "Tail Rotor Gear Box PN:350A33-0210-00  SN:MA121437",
      hourLimit1: "3000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-06-29",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L126-$L$3",
      dateDue: "",
      ttCycleDue: "=C126+H126",
      due: '=IF(J126<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 127 - Pitch Change
    {
      _id: "127",
      rowType: "part",
      componentName:
        "Pitch Change(LEVER T.G.B. CONTROL) PN:350A33-1535.00  SN:MA86830",
      hourLimit1: "20000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-06-29",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L127-$L$3",
      dateDue: "",
      ttCycleDue: "=C127+H127",
      due: '=IF(J127<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 128 - Bevel Wheel
    {
      _id: "128",
      rowType: "part",
      componentName: "Bevel Wheel PN:350A33-1001-21 SN:L14299",
      hourLimit1: "16500",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-01-01",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L128-$L$3",
      dateDue: "",
      ttCycleDue: "=C128+H128",
      due: '=IF(J128<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 129 - Bevel Gear
    {
      _id: "129",
      rowType: "part",
      componentName: "Bevel Gear  PN:350A33-1000-21 SN:L15913",
      hourLimit1: "5500",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-01-01",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L129-$L$3",
      dateDue: "",
      ttCycleDue: "=C129+H129",
      due: '=IF(J129<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 130 - T.G.B Casing
    {
      _id: "130",
      rowType: "part",
      componentName: "T.G.B Casing PN:350A33-1090-02 SN:MA119279",
      hourLimit1: "20000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-01-01",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L130-$L$3",
      dateDue: "",
      ttCycleDue: "=C130+H130",
      due: '=IF(J130<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 131 - Tail Rotor Shaft
    {
      _id: "131",
      rowType: "part",
      componentName: "Tail Rotor Shaft PN:350A33-1092-01 SN:MA116177",
      hourLimit1: "20000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-01-01",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L131-$L$3",
      dateDue: "",
      ttCycleDue: "=C131+H131",
      due: '=IF(J131<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 132 - Spider (Header)
    {
      _id: "132",
      rowType: "header",
      componentName: "Spider PN:350A33-2167-01 SN:MA121437",
      hourLimit1: "",
      hourLimit2: "OC",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 133 - Spider Greasable Bearing
    {
      _id: "133",
      rowType: "part",
      componentName: "Spider Greasable Bearing PN:704A33651210 SN:NR11205",
      hourLimit1: "3000",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "1825",
      dayType: "D",
      dateCW: "2026-01-01",
      hoursCW: "0",
      daysRemaining: "=K133-$L$1",
      timeRemaining: "=L133-$L$3",
      dateDue: "=G133+E133",
      ttCycleDue: "=C133+H133",
      due: '=IF(I133<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 134 - ELASTOMERIC Pitch Rod LK6662
    {
      _id: "134",
      rowType: "part",
      componentName: "ELASTOMERIC Pitch Rod PN:LB6-1231-3-2 SN:LK6662",
      hourLimit1: "20000",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "1825",
      dayType: "D",
      dateCW: "2021-06-30",
      hoursCW: "0",
      daysRemaining: "2711.6",
      timeRemaining: "",
      dateDue: "=G134+E134",
      ttCycleDue: "",
      due: '=IF(I134<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 135 - ELASTOMERIC Pitch Rod LK6665
    {
      _id: "135",
      rowType: "part",
      componentName: "ELASTOMERIC Pitch Rod PN:LB6-1231-3-2 SN:LK6665",
      hourLimit1: "20000",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "1825",
      dayType: "D",
      dateCW: "2021-06-30",
      hoursCW: "0",
      daysRemaining: "2711.6",
      timeRemaining: "",
      dateDue: "=G135+E135",
      ttCycleDue: "",
      due: '=IF(I135<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 136 - Servo Controls (Header)
    {
      _id: "136",
      rowType: "header",
      componentName: "Servo Controls",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 137 - MR (Servo-Control,FRONT AND LH) 4278
    {
      _id: "137",
      rowType: "part",
      componentName: "MR (Servo-Control,FRONT AND LH) PN:SC8042 SN:4278",
      hourLimit1: "3000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "7300",
      dayType: "D",
      dateCW: "2020-07-01",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L137-$L$3",
      dateDue: "=E137+G137",
      ttCycleDue: "=C137+H137",
      due: '=IF(J137<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 138 - MR (Servo Control,FRONT AND LH) 4282
    {
      _id: "138",
      rowType: "part",
      componentName: "MR (Servo Control,FRONT AND LH) PN:SC8042 SN:4282",
      hourLimit1: "3000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "7300",
      dayType: "D",
      dateCW: "2020-07-01",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=C138-P138",
      dateDue: "=E138+G138",
      ttCycleDue: "=C138-O138+H138",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 139 - MR (Servo Control,FRONT AND RH)
    {
      _id: "139",
      rowType: "part",
      componentName: "MR (Servo Control,FRONT AND RH)  PN:SC8043 SN:2259",
      hourLimit1: "3000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "7300",
      dayType: "D",
      dateCW: "2020-07-01",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L139-$L$3",
      dateDue: "=E139+G139",
      ttCycleDue: "=C139-O139+H139",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 140 - (TR) Rear (ServoControl,TAIL)
    {
      _id: "140",
      rowType: "part",
      componentName: "(TR) Rear (ServoControl,TAIL)  PN:SC5072 SN:4414",
      hourLimit1: "3000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "7300",
      dayType: "D",
      dateCW: "2020-07-02",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L140-$L$3",
      dateDue: "=E140+G140",
      ttCycleDue: "=C140+H140",
      due: '=IF(J140<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 141 - Suspension (BAR,FWD,MGB) 7644
    {
      _id: "141",
      rowType: "part",
      componentName: "Suspension (BAR,FWD,MGB) PN:B211000-074  SN:7644",
      hourLimit1: "3600",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "2190",
      dayType: "",
      dateCW: "2020-07-03",
      hoursCW: "0",
      daysRemaining: "=K141-$L$1",
      timeRemaining: "=L141-$L$3",
      dateDue: "=G141+E141",
      ttCycleDue: "=C141+H141",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 142 - Suspension (BAR,FWD,MGB) 7642
    {
      _id: "142",
      rowType: "part",
      componentName: "Suspension (BAR,FWD,MGB) PN:B211000-074  SN:7642",
      hourLimit1: "3600",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "2190",
      dayType: "",
      dateCW: "2020-07-04",
      hoursCW: "0",
      daysRemaining: "=K142-$L$1",
      timeRemaining: "=L142-$L$3",
      dateDue: "=G142+E142",
      ttCycleDue: "=C142+H142",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 143 - Starting (Header)
    {
      _id: "143",
      rowType: "header",
      componentName: "Starting",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 144 - Starter Generator
    {
      _id: "144",
      rowType: "part",
      componentName: "Starter Generator PN:704A46101026  SN: S01107",
      hourLimit1: "1200",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-09-07",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "=L144-$L$3",
      dateDue: "",
      ttCycleDue: "=C144+H144",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 145 - Starter Generator Checking of brushes
    {
      _id: "145",
      rowType: "part",
      componentName:
        "Starter Generator PN:704A46101026  SN: S01107                      Cheking of brushes 300h",
      hourLimit1: "300",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2025-09-07",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "300",
      dateDue: "",
      ttCycleDue: "=C145+H145",
      due: '=IF(J145<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 146 - Hydraulic Pump Drive Brg.
    {
      _id: "146",
      rowType: "part",
      componentName: "Hydraulic Pump Drive Brg. P/N:704A34310004  SN:190722982",
      hourLimit1: "3600",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "2190",
      dayType: "D",
      dateCW: "2020-07-01",
      hoursCW: "3600",
      daysRemaining: "=K146-$L$1",
      timeRemaining: "=L146-$L$3",
      dateDue: "=G146+E146",
      ttCycleDue: "=C146+H146",
      due: '=IF(J146<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 147 - Poly V Belt
    {
      _id: "147",
      rowType: "part",
      componentName: "Poly V Belt P/N:POLYV597K4 SN: F3444 POLY-V",
      hourLimit1: "3600",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "2190",
      dayType: "D",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "=K147-$L$1",
      timeRemaining: "=L147-$L$3",
      dateDue: "2026-12-18",
      ttCycleDue: "=C147+H147",
      due: '=IF(J147<=30,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 148 - POWERPLANT COMPONENT/ ENGINE (Header)
    {
      _id: "148",
      rowType: "header",
      componentName: "POWERPLANT COMPONENT/ ENGINE",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 149 - Engine Model (Header)
    {
      _id: "149",
      rowType: "header",
      componentName: "Engine Model: Arriel 2D",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 150 - Date of Manufactured (Header)
    {
      _id: "150",
      rowType: "header",
      componentName: "Date of Manufactured:26 MAY 2020",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 151 - ENGINE OIL CHANGE
    {
      _id: "151",
      rowType: "part",
      componentName: "ENGINE OIL CHANGE",
      hourLimit1: "",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "D",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 152 - Powerplant (Turbomeca Arriel 2D)
    {
      _id: "152",
      rowType: "part",
      componentName: "Powerplant (Turbomeca Arriel 2D) SN:50307",
      hourLimit1: "5000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "5475",
      dayType: "D",
      dateCW: "2020-05-26",
      hoursCW: "0",
      daysRemaining: "=K152-$L$1",
      timeRemaining: "=L152-$L$3",
      dateDue: "=G152+E152",
      ttCycleDue: "=C152+H152",
      due: '=IF(J152<=30,"DUE","")',
      hd: '=IF(I152<=365,"DUE","")',
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 153 - Module 01
    {
      _id: "153",
      rowType: "part",
      componentName: "Module 01- Accessory Gear Box  PN:70BM010020  SN:23580",
      hourLimit1: "5000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "5475",
      dayType: "D",
      dateCW: "2020-05-26",
      hoursCW: "0",
      daysRemaining: "=K153-$L$1",
      timeRemaining: "=L153-$L$3",
      dateDue: "=G153+E153",
      ttCycleDue: "=C153+H153",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 154 - Module 02
    {
      _id: "154",
      rowType: "part",
      componentName: "Module 02- Axial Compressor PN:70BM020010 SN:26342",
      hourLimit1: "5000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "5475",
      dayType: "D",
      dateCW: "2020-05-26",
      hoursCW: "0",
      daysRemaining: "=K154-$L$1",
      timeRemaining: "=L154-$L$3",
      dateDue: "=G154+E154",
      ttCycleDue: "=C154+H154",
      due: '=IF(J154<=30,"DUE","")',
      hd: '=IF(I154<=365,"DUE","")',
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 155 - Module 03
    {
      _id: "155",
      rowType: "part",
      componentName: "Module 03- Gas Generator PN:70BM030070  SN:33917",
      hourLimit1: "5000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "5475",
      dayType: "D",
      dateCW: "2020-05-26",
      hoursCW: "0",
      daysRemaining: "=K155-$L$1",
      timeRemaining: "=L155-$L$3",
      dateDue: "=G155+E155",
      ttCycleDue: "=C155+H155",
      due: '=IF(J155<=30,"DUE","")',
      hd: '=IF(I155<=365,"DUE","")',
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 156 - Module 04
    {
      _id: "156",
      rowType: "part",
      componentName: "Module 04- Free Turbine PN: 70BM040020 SN:29347",
      hourLimit1: "5000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "5475",
      dayType: "D",
      dateCW: "2020-05-26",
      hoursCW: "0",
      daysRemaining: "=K156-$L$1",
      timeRemaining: "=L156-$L$3",
      dateDue: "=G156+E156",
      ttCycleDue: "=C156+H156",
      due: '=IF(J156<=30,"DUE","")',
      hd: '=IF(I156<=365,"DUE","")',
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 157 - Module 05
    {
      _id: "157",
      rowType: "part",
      componentName: "Module 05- Reduction Gear PN:70BM050010 SN:27316",
      hourLimit1: "5000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "5475",
      dayType: "D",
      dateCW: "2020-05-26",
      hoursCW: "0",
      daysRemaining: "=K157-$L$1",
      timeRemaining: "=L157-$L$3",
      dateDue: "=G157+E157",
      ttCycleDue: "=C157+H157",
      due: '=IF(J157<=30,"DUE","")',
      hd: '=IF(I157<=365,"DUE","")',
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 158 - Module 02 TBO 4000Hrs
    {
      _id: "158",
      rowType: "part",
      componentName: "Module 02 TBO 4000Hrs",
      hourLimit1: "5000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "5475",
      dayType: "D",
      dateCW: "2020-05-26",
      hoursCW: "0",
      daysRemaining: "=K158-$L$1",
      timeRemaining: "=L158-$L$3",
      dateDue: "=G158+E158",
      ttCycleDue: "=C158+H158",
      due: '=IF(J158<=30,"DUE","")',
      hd: '=IF(I158<=365,"DUE","")',
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 159 - Axial Compressor Wheel
    {
      _id: "159",
      rowType: "part",
      componentName: "Axial Compressor Wheel PN:2292153370 SN:4416FB",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 160 - N1 22000 C LIFE LIMIT (Header)
    {
      _id: "160",
      rowType: "header",
      componentName: "N1 22000 C LIFE LIMIT",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-05-26",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L160-$H$3",
      dateDue: "",
      ttCycleDue: "=C160+H160",
      due: '=IF(J160<=1000,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 161 - Module 03 Life Limited Parts (Header)
    {
      _id: "161",
      rowType: "header",
      componentName: "Module 03 Life Limited Parts",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 162 - Centrifugal Impeller
    {
      _id: "162",
      rowType: "part",
      componentName: "Centrifugal  Impeller PN:0292260110 SN:1585FRF",
      hourLimit1: "22000",
      hourLimit2: "C",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-05-26",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L162-$H$3",
      dateDue: "",
      ttCycleDue: "=C162+H162",
      due: '=IF(J162<=1000,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 163 - Injection Wheel
    {
      _id: "163",
      rowType: "part",
      componentName: "Injection Wheel PN:2292260750 SN:DD9O7CTF",
      hourLimit1: "8000",
      hourLimit2: "C",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-05-26",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L163-$H$3",
      dateDue: "",
      ttCycleDue: "=C163+H163",
      due: '=IF(J163<=1000,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 164 - HP Turbine Disc
    {
      _id: "164",
      rowType: "part",
      componentName: "HP Turbine Disc PN:2292260060 SN:CG057CTF",
      hourLimit1: "17000",
      hourLimit2: "C",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-05-26",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L164-$H$3",
      dateDue: "",
      ttCycleDue: "=C164+H164",
      due: '=IF(J164<=1000,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 165 - Usage Limited Parts (Header)
    {
      _id: "165",
      rowType: "header",
      componentName: "Usage Limited Parts",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 166 - HP Turbine Blades
    {
      _id: "166",
      rowType: "part",
      componentName: "HP Turbine Blades PN: 229226A560 SN:37643",
      hourLimit1: "10000",
      hourLimit2: "C",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-05-26",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L166-$J$3",
      dateDue: "",
      ttCycleDue: "=C166+H166",
      due: '=IF(J166<=1000,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 167 - Module 04 (Header)
    {
      _id: "167",
      rowType: "header",
      componentName: "Module 04",
      hourLimit1: "4000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-05-26",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L167-$H$3",
      dateDue: "",
      ttCycleDue: "=C167+H167",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 168 - Life Limited Parts (Header)
    {
      _id: "168",
      rowType: "header",
      componentName: "Life Limited Parts",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 169 - Free Turbine Disc
    {
      _id: "169",
      rowType: "part",
      componentName: "Free Turbine Disc PN:2292810790 SN:AE908CTF",
      hourLimit1: "22000",
      hourLimit2: "C",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-05-26",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L169-$J$3",
      dateDue: "",
      ttCycleDue: "=C169+H169",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 170 - Power turbine nut
    {
      _id: "170",
      rowType: "part",
      componentName: "Power turbine nut PN:0292810450 SN:4470",
      hourLimit1: "6000",
      hourLimit2: "C",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-05-26",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L170-$J$3",
      dateDue: "",
      ttCycleDue: "=C170+H170",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 171 - Power turbine blades
    {
      _id: "171",
      rowType: "part",
      componentName: "Power turbine blades PN:229281A440 SN:91914",
      hourLimit1: "10000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-05-26",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L171-$J$3",
      dateDue: "",
      ttCycleDue: "=C171+H171",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 172 - Module 05 (Header)
    {
      _id: "172",
      rowType: "header",
      componentName: "Module 05",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 173 - Life Limited Parts (Header)
    {
      _id: "173",
      rowType: "header",
      componentName: "Life Limited Parts",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 174 - Sleeve Assy
    {
      _id: "174",
      rowType: "part",
      componentName: "Sleeve Assy PN:0292717600  SN:2451DMP",
      hourLimit1: "6000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "5475",
      dayType: "D",
      dateCW: "2020-05-26",
      hoursCW: "0",
      daysRemaining: "=K174-$L$1",
      timeRemaining: "=L174-$L$3",
      dateDue: "=G174+E174",
      ttCycleDue: "=C174+H174",
      due: '=IF(J174<=30,"DUE","")',
      hd: '=IF(I174<=365,"DUE","")',
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 175 - Spline Nut
    {
      _id: "175",
      rowType: "part",
      componentName: "Spline Nut PN:0292710510  SN:8870",
      hourLimit1: "6000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "5475",
      dayType: "D",
      dateCW: "2020-05-26",
      hoursCW: "0",
      daysRemaining: "=K175-$L$1",
      timeRemaining: "=L175-$L$3",
      dateDue: "=G175+E175",
      ttCycleDue: "=C175+H175",
      due: '=IF(J175<=30,"DUE","")',
      hd: '=IF(I175<=365,"DUE","")',
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 176 - Equipt Free Wheel Shaft Assy
    {
      _id: "176",
      rowType: "part",
      componentName: "Equipt Free Wheel Shaft Assy. PN:0292900200  SN:8604",
      hourLimit1: "5000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-05-26",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L176-$L$3",
      dateDue: "",
      ttCycleDue: "=C176+H176",
      due: '=IF(J176<=1000,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 177 - Free Wheel
    {
      _id: "177",
      rowType: "part",
      componentName: "Free Wheel PN:9560901230  SN:1693",
      hourLimit1: "5000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-05-26",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L177-$L$3",
      dateDue: "",
      ttCycleDue: "=C177+H177",
      due: '=IF(J177<=1000,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 178 - Bearing 1748SN
    {
      _id: "178",
      rowType: "part",
      componentName: "Bearing PN:9606651001 SN: 1748SN",
      hourLimit1: "5000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-05-26",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L178-$L$3",
      dateDue: "",
      ttCycleDue: "=C178+H178",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 179 - Bearing 1775SN
    {
      _id: "179",
      rowType: "part",
      componentName: "Bearing PN:9606681001 SN: 1775SN",
      hourLimit1: "5000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-05-26",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L179-$L$3",
      dateDue: "",
      ttCycleDue: "=C179+H179",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 180 - Bearing 1886SN
    {
      _id: "180",
      rowType: "part",
      componentName: "Bearing PN: 9606490606 SN: 1886SN",
      hourLimit1: "5000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-05-26",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L180-$L$3",
      dateDue: "",
      ttCycleDue: "=C180+H180",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 181 - Free Wheel Flange
    {
      _id: "181",
      rowType: "part",
      componentName: "Free Wheel Flange  PN: 0292900250 SN: 1967CZ",
      hourLimit1: "90000",
      hourLimit2: "C",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-05-26",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L181-$J$3",
      dateDue: "",
      ttCycleDue: "=C181+H181",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 182 - Free Wheel Shaft
    {
      _id: "182",
      rowType: "part",
      componentName: "Free Wheel Shaft  PN:0292900230  SN: 5617",
      hourLimit1: "120000",
      hourLimit2: "C",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "2020-05-26",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L182-$J$3",
      dateDue: "",
      ttCycleDue: "=C182+H182",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 183 - Pump& Metering Valve Assy 51687
    {
      _id: "183",
      rowType: "part",
      componentName:
        "Pump& Metering Valve Assy,Adjusted PN:0292862200  SN: 51687",
      hourLimit1: "4000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "3650",
      dayType: "",
      dateCW: "2020-05-26",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "=L183-$J$3",
      dateDue: "",
      ttCycleDue: "=C183+H183",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 184 - Pump& Metering Valve Assy 51688
    {
      _id: "184",
      rowType: "part",
      componentName:
        "Pump& Metering Valve Assy,Adjusted PN:0292862200  SN: 51688",
      hourLimit1: "4000",
      hourLimit2: "H",
      hourLimit3: "",
      dayLimit: "3650",
      dayType: "",
      dateCW: "2020-05-26",
      hoursCW: "0",
      daysRemaining: "=K184-$L$1",
      timeRemaining: "=L184-$L$3-409",
      dateDue: "=G184+E184",
      ttCycleDue: "=C184+H184",
      due: '=IF(J184<=1000,"DUE","")',
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 185 - Valve Assy
    {
      _id: "185",
      rowType: "part",
      componentName: "Valve Assy PN:0292950800 SN:5285",
      hourLimit1: "",
      hourLimit2: "OC",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 186 - CARGO SLING INSPECTION
    {
      _id: "186",
      rowType: "part",
      componentName: "CARGO SLING INSPECTION",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "",
      hoursCW: "",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 187 - EQUIPMENTS/ACCESSORIES (Header)
    {
      _id: "187",
      rowType: "header",
      componentName: "EQUIPMENTS/ACCESSORIES",
      hourLimit1: "",
      hourLimit2: "",
      hourLimit3: "",
      dayLimit: "",
      dayType: "",
      dateCW: "",
      hoursCW: "0",
      daysRemaining: "",
      timeRemaining: "",
      dateDue: "",
      ttCycleDue: "",
      due: "",
      hd: "",
      timeSinceInstall: "",
      totalTimeSinceNew: "",
    },

    // Row 188-216 - Equipment items (all with OC - ON CONDITION)
    ...Array.from({ length: 29 }, (_, i) => {
      const equipmentNames = [
        "EECU PN: 70BMN01060 SN:5635",
        "H. E. Igniter PN:9550168770 SN:19124749",
        "H. E. Igniter PN:9550168770 SN:19124888",
        "Alternator PN:9550002100 SN:1339",
        "H.E Box PN: 9421003400 SN:7674",
        "Electric magnetic plug PN:9550171750 SN:DV8436",
        "Magnetic Plug PN:9560171170 SN:28818",
        "Magnetic Plug PN:9560171170 SN:28831",
        "N1Speed Sensor PN:9550175810 SN:25347MXM",
        "N1Speed Sensor PN:9550175810 SN:25303MXM",
        "N2 Speed Sensor PN:9550175800 SN:25239MXM",
        "N2 Speed Sensor PN:9550175800 SN:25285MXM",
        "N2 Speed Sensor PN:9550175800 SN:25296MXM",
        "Equipped Valve Assy  PN:0292727300 SN:10459",
        "Engine data recorder PN:9580119130 SN:3886",
        "Control & Monitoring Harness PN:0292697770 SN:1703EL",
        "Control Harness PN:0292697830 SN:2145EL",
        "Harness,Pyrometric PN:9550178220 SN:12243",
        "Harness,Pyrometric PN:9550178230 SN:11712",
        "Fuel filter visual block indicator PN:9560166910 SN:A1853",
        "Injector PN:0283317500 SN: 19565MM",
        "Injector PN:0283317500 SN: 19582MM",
        "Oil Pump PN:0292125140 SN:4106MTL",
        "P3,PRES, Transmitter PN:9550171420 SN:BAY9725",
        "Pressure transmitter PN:9421000800 SN:TMAD009787",
        "Pressure transmitter PN:9421000800 SN:TMAD009545",
        "Pressure and TemperatureTransmitter PN:9421001000 SN:TMAE008845",
        "Pressure and TemperatureTransmitter PN:9421001000 SN:TMAE008945",
        "Bleed valve PN:9550178980 SN:3259",
      ];
      return {
        _id: String(188 + i),
        rowType: "part",
        componentName: equipmentNames[i],
        hourLimit1: "",
        hourLimit2: "OC",
        hourLimit3: "",
        dayLimit: "",
        dayType: "",
        dateCW: "",
        hoursCW: "0",
        daysRemaining: "",
        timeRemaining: "",
        dateDue: "",
        ttCycleDue: "",
        due: "",
        hd: "",
        timeSinceInstall: "",
        totalTimeSinceNew: "",
      };
    }),
  ]);

  // Compute derived data using formulas whenever rawData or refs change
  const computedData = useMemo(() => {
    const processedData = processDataWithFormulas(rawData, refs);

    // Format dates in the processed data
    return processedData.map((row) => ({
      ...row,
      dateCW: formatDate(row.dateCW),
      dateDue: formatDate(row.dateDue),
    }));
  }, [rawData, refs]);

  // Determine if a cell is editable
  const isCellEditable = (record, dataIndex) => {
    // Only part rows are editable
    if (record.rowType !== "part") return false;
    // Derived columns are not editable (they are recalculated)
    const nonEditable = [
      "componentName",
      "hourLimit1",
      "hourLimit2",
      "daysRemaining",
      "timeRemaining",
      "dateDue",
      "ttCycleDue",
      "due",
    ];
    return !nonEditable.includes(dataIndex);
  };

  // Handle cell value change
  const handleCellEdit = (recordId, dataIndex, newValue) => {
    setRawData((prev) =>
      prev.map((row) =>
        row._id === recordId ? { ...row, [dataIndex]: newValue } : row,
      ),
    );
  };

  return (
    <div className="parts-monitoring-container" style={{ padding: 20 }}>
      <Row gutter={[16, 16]} align="middle">
        {/* Search */}
        <Col xs={24} lg={7}>
          <Input
            placeholder="Search..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            size="large"
            allowClear
            style={{ width: "100%" }}
          />
        </Col>

        {/* Select */}
        <Col xs={24} lg={5}>
          <Select
            value={selectedAircraft}
            onChange={(value) => setSelectedAircraft(value)}
            loading={loadingAircraft}
            size="large"
            style={{ width: "100%" }}
            options={aircraftOptions.map((aircraft) => ({
              label: aircraft,
              value: aircraft,
            }))}
          />
        </Col>

        {/* Actions */}
        <Col xs={24} lg={12}>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <Button type="primary" icon={<PlusOutlined />} size="large">
              Add Aircraft
            </Button>

            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveToDatabase}
              loading={saving}
              style={{ backgroundColor: "#52c41a", borderColor: "#52c41a" }}
              size="large"
            >
              Save
            </Button>

            {lastSaved && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Last saved: {lastSaved.toLocaleTimeString()}
              </Text>
            )}
          </div>
        </Col>
      </Row>
      <Divider />

      {/* Info Cards with reference inputs - same as before */}
      <Row gutter={[16, 16]} style={{ marginBottom: "16px" }}>
        <Col span={6}>
          <Card className="aircraft-card">
            <div className="card-content">
              <div className="info-item">
                <Text className="info-label">Aircraft: </Text>
                <Text className="info-value">
                  {selectedAircraft || "Not selected"}
                </Text>
              </div>
              <div className="info-item">
                <Text className="info-label">Date Manufactured: </Text>
                <Text className="info-value">
                  {aircraftDetails.dateManufactured
                    ? aircraftDetails.dateManufactured.toLocaleDateString()
                    : "Not available"}
                </Text>
              </div>
              <div className="info-item">
                <Text className="info-label">Acft. Type: </Text>
                <Text className="info-value">
                  {aircraftDetails.aircraftType || "Not available"}
                </Text>
              </div>
              <div>
                <Text className="info-label">Creep Damage: </Text>
                <Text className="info-value">
                  {aircraftDetails.creepDamage || "Not available"}
                </Text>
              </div>
            </div>
          </Card>
        </Col>
        <Col span={18}>
          <Card className="aircraft-card">
            <div className="input-row">
              <div className="input-group">
                <Text className="card-input-label">Engine Cycle:</Text>
                <Input
                  size="small"
                  className="card-input-field"
                  value={refs.landings}
                  onChange={(e) =>
                    setRefs((prev) => ({
                      ...prev,
                      landings: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="input-group">
                <Text className="card-input-label">Date:</Text>
                <Input
                  type="date"
                  size="small"
                  className="card-input-field"
                  value={refs.today.toISOString().split("T")[0]}
                  onChange={(e) =>
                    setRefs((prev) => ({
                      ...prev,
                      today: new Date(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <div className="input-row">
              <div className="input-group">
                <Text className="card-input-label">N1:</Text>
                <Input
                  size="small"
                  className="card-input-field"
                  value={refs.n1Cycles}
                  onChange={(e) =>
                    setRefs((prev) => ({
                      ...prev,
                      n1Cycles: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="input-group">
                <Text className="card-input-label">Eng. TT:</Text>
                <Input
                  size="small"
                  className="card-input-field"
                  value={refs.acftTT}
                  onChange={(e) =>
                    setRefs((prev) => ({
                      ...prev,
                      acftTT: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <div className="input-row">
              <div className="input-group">
                <Text className="card-input-label">N2:</Text>
                <Input
                  size="small"
                  className="card-input-field"
                  value={refs.n2Cycles}
                  onChange={(e) =>
                    setRefs((prev) => ({
                      ...prev,
                      n2Cycles: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="input-group">
                <Text className="card-input-label">Acft. TT:</Text>
                <Input
                  size="small"
                  className="card-input-field"
                  value={refs.acftTT}
                  onChange={(e) =>
                    setRefs((prev) => ({
                      ...prev,
                      acftTT: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <div className="input-row">
              <div className="input-group">
                <Text className="card-input-label">Landings:</Text>
                <Input
                  size="small"
                  className="card-input-field"
                  value={refs.landings}
                  onChange={(e) =>
                    setRefs((prev) => ({
                      ...prev,
                      landings: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="input-group">
                <Text className="card-input-label">Sling:</Text>
                <Input size="small" className="card-input-field" />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card size="medium" style={{ marginBottom: 10 }}>
        <Row
          align="middle"
          gutter={[12, 8]}
          style={{ flexWrap: "wrap", gap: "16px" }}
        >
          <Text className="note-title">NOTE:</Text>

          <div>
            <Text style={{ fontWeight: "bold" }}>OC</Text> - ON CONDITION
          </div>
          <div>
            <Text style={{ fontWeight: "bold" }}>H</Text> - HOURS
          </div>
          <div>
            <Text style={{ fontWeight: "bold" }}>D</Text> - DAY
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="status-box status-removed" />
            <Text>- REMOVED</Text>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="status-box status-installed" />
            <Text>- INSTALLED</Text>
          </div>
        </Row>
      </Card>

      {/* Editable Table */}
      {/* <div className="table-container"> */}
      <PMonitoringTable
        headers={columnHeader}
        data={computedData}
        loading={false}
        editable={true}
        isCellEditable={isCellEditable}
        onCellEdit={handleCellEdit}
        rowKey="_id"
        scroll={{ x: 1500 }}
      />
    </div>
  );
}
