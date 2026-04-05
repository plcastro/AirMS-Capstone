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
import { PLMmockdata } from "./plmmockdata";

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

  const [rawData, setRawData] = useState(PLMmockdata);

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
        <Col xs={24} md={8} lg={6}>
          <Card>
            <div className="card-content">
              <div className="info-item">
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
              <div className="info-item">
                <Text>Acft. Type: </Text>
                <Text className="info-value">
                  {aircraftDetails.aircraftType || "Not available"}
                </Text>
              </div>
              <div>
                <Text>Creep Damage: </Text>
                <Text className="info-value">
                  {aircraftDetails.creepDamage || "Not available"}
                </Text>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={16} lg={18}>
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
