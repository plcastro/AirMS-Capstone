import React, { useState, useMemo, useEffect } from "react";
import {
  Row,
  Col,
  Typography,
  Select,
  Button,
  Input,
  Card,
  Tooltip,
} from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import PMonitoringTable from "../../../components/tables/PMonitoringTable";
// Import the default processor for AS350B3
import {
  processDataWithFormulas as processAS350,
  getToday,
} from "../../../utils/partsFormula-AS350B3";
// Import the processor for Bell 412 (create it if needed)
//import { processDataWithFormulas as processB412 } from "../../../utils/partsFormula-B412";
import "./PartsLifespanMonitoring.css";
import { message } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { API_BASE } from "../../../utils/API_BASE";

// Import default raw data for each aircraft
import { rawData as rawData8912 } from "../../../utils/8912RawData";
import { rawData as rawData7247 } from "../../../utils/7247RawData";
import { rawData as rawData7226 } from "../../../utils/7226RawData";
import { rawData as rawData7057 } from "../../../utils/7057RawData";
import { rawData as rawData9511 } from "../../../utils/9511RawData";
//import { rawData as rawData2810 } from "../../../utils/2810RawData"; // Bell 412

// Default reference values for each aircraft (acftTT, n1Cycles, n2Cycles, landings)
const defaultRefsMap = {
  "RP-C8912": { acftTT: 902.1, n1Cycles: 810, n2Cycles: 302, landings: 613 },
  "RP-C7247": {
    acftTT: 3233.7,
    n1Cycles: 2952.77,
    n2Cycles: 6677.3,
    landings: 3388,
  },
  "RP-C7226": {
    acftTT: 2813.4,
    n1Cycles: 5990.9,
    n2Cycles: 2949.59,
    landings: 3416,
  },
  "RP-C7057": {
    acftTT: 3344.4,
    n1Cycles: 2276.44,
    n2Cycles: 1736.34,
    landings: 4140,
  },
  "RP-C9511": {
    acftTT: 814.5,
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
  if (aircraft === "RP-C2810") return processB412;
  // All other AS350B3 variants use the standard processor
  return processAS350;
};

const { Text } = Typography;

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
  const [refs, setRefs] = useState({
    today: getToday(),
    acftTT: 0,
    n1Cycles: 0,
    n2Cycles: 0,
    landings: 0,
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
        n1Cycles: defaultRefsValues.n1Cycles,
        n2Cycles: defaultRefsValues.n2Cycles,
        landings: defaultRefsValues.landings,
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
            n1Cycles: referenceData.n1Cycles,
            n2Cycles: referenceData.n2Cycles,
            landings: referenceData.landings,
          });
        }
        if (parts && parts.length > 0) {
          setRawData(parts);
          message.success(`Loaded saved data for ${aircraft}`);
        } else {
          // No parts in saved data, fallback to default
          loadDefaultData(aircraft);
        }
      } else if (response.status === 404) {
        // No saved data, use default
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

  // Reload when aircraft changes
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

  // Compute derived data using the correct formula processor for the selected aircraft
  const computedData = useMemo(() => {
    if (!selectedAircraft || rawData.length === 0) return [];
    const processor = getFormulaProcessor(selectedAircraft);
    return processor(rawData, refs);
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

  return (
    <div
      style={{
        padding: 20,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        paddingBottom: 120,
      }}
    >
      <Row justify="space-between" align="middle" className="header-row">
        <Col>
          <div className="header-left">
            <Input
              placeholder="Search..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="search-input"
              size="large"
              allowClear
            />
            <Select
              value={selectedAircraft}
              onChange={(value) => setSelectedAircraft(value)}
              style={{ width: 180 }}
              loading={loadingAircraft}
              options={aircraftOptions.map((aircraft) => ({
                label: aircraft,
                value: aircraft,
              }))}
              size="large"
            />
            {/* <Button type="primary" icon={<PlusOutlined />}>
              Add Aircraft
            </Button> */}
            <Tooltip title="Save to Database">
              <Button
                type="primary"
                onClick={handleSaveToDatabase}
                loading={saving}
                disabled={!selectedAircraft}
                // style={{ backgroundColor: "#52c41a", borderColor: "#52c41a" }}
                size="large"
              >
                <SaveOutlined />
              </Button>
            </Tooltip>
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

      <Row gutter={[16, 16]} style={{ marginBottom: "16px" }}>
        {/* Left Card - Aircraft Info */}
        <Col xs={24} md={8} lg={6}>
          <Card>
            <Row>
              <Text type="secondary">
                Aircraft:{" "}
                <Text strong>{selectedAircraft || "Not selected"}</Text>
              </Text>
            </Row>
            <Row className="info-item">
              <Text type="secondary">
                Date Manufactured:{" "}
                <Text strong>
                  {aircraftDetails.dateManufactured
                    ? aircraftDetails.dateManufactured.toLocaleDateString()
                    : "Not available"}
                </Text>
              </Text>
            </Row>
            <Row className="info-item">
              <Text type="secondary">
                Acft. Type:{" "}
                <Text strong>
                  {aircraftDetails.aircraftType || "Not available"}
                </Text>
              </Text>
            </Row>
            <Row className="info-item">
              <Text type="secondary">
                Creep Damage:{" "}
                <Text strong>
                  {aircraftDetails.creepDamage + "%" || "Not available"}
                </Text>
              </Text>
            </Row>
          </Card>
        </Col>

        {/* Right Card - Inputs */}
        <Col xs={24} md={16} lg={18}>
          <Card>
            <Row gutter={[16, 16]}>
              {/* Engine Cycle */}
              <Col xs={24} md={12}>
                <Text>Engine Cycle:</Text>
                <Input
                  value={refs.landings}
                  onChange={(e) =>
                    setRefs((prev) => ({
                      ...prev,
                      landings: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </Col>

              {/* Date */}
              <Col xs={24} md={12}>
                <Text>Date:</Text>
                <Input
                  type="date"
                  value={refs.today.toISOString().split("T")[0]}
                  onChange={(e) =>
                    setRefs((prev) => ({
                      ...prev,
                      today: new Date(e.target.value),
                    }))
                  }
                />
              </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: "16px" }}>
              {/* N1 */}
              <Col xs={12} md={6}>
                <Text>N1:</Text>
                <Input
                  value={refs.n1Cycles}
                  onChange={(e) =>
                    setRefs((prev) => ({
                      ...prev,
                      n1Cycles: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </Col>

              {/* N2 */}
              <Col xs={12} md={6}>
                <Text>N2:</Text>
                <Input
                  value={refs.n2Cycles}
                  onChange={(e) =>
                    setRefs((prev) => ({
                      ...prev,
                      n2Cycles: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </Col>

              {/* Engine TT */}
              <Col xs={12} md={6}>
                <Text>Eng. TT:</Text>
                <Input
                  value={refs.engTT}
                  onChange={(e) =>
                    setRefs((prev) => ({
                      ...prev,
                      engTT: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </Col>

              {/* Aircraft TT */}
              <Col xs={12} md={6}>
                <Text>Acft. TT:</Text>
                <Input
                  value={refs.acftTT}
                  onChange={(e) =>
                    setRefs((prev) => ({
                      ...prev,
                      acftTT: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: "16px" }}>
              {/* Landings */}
              <Col xs={12} md={6}>
                <Text>Landings:</Text>
                <Input
                  value={refs.landings}
                  onChange={(e) =>
                    setRefs((prev) => ({
                      ...prev,
                      landings: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </Col>

              {/* Sling */}
              <Col xs={12} md={6}>
                <Text>Sling:</Text>
                <Input />
              </Col>
            </Row>
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

      <PMonitoringTable
        headers={columnHeader}
        data={computedData}
        loading={loading}
        editable={!!selectedAircraft}
        isCellEditable={isCellEditable}
        onCellEdit={handleCellEdit}
        rowKey="_id"
        scroll={{ x: 1500 }}
      />
    </div>
  );
}
