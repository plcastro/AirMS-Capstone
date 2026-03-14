import React from "react";
import { Row, Col, Typography, Select, Button, Input, Card } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import PMonitoringTable from "../../../components/tables/PMonitoringTable";
import "./PartsMonitoring.css";

const { Text } = Typography;
const { Option } = Select;

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
      {
        title: "",
        dataIndex: "hourLimit1",
        key: "hourLimit1",
        width: 60,
      },
      {
        title: "",
        dataIndex: "hourLimit2",
        key: "hourLimit2",
        width: 60,
      },
      {
        title: "",
        dataIndex: "hourLimit3",
        key: "hourLimit3",
        width: 60,
      },
    ],
  },
  {
    title: "DAY LIMIT",
    dataIndex: "dayLimit",
    key: "dayLimit",
    width: 80,
  },
  {
    title: "",
    dataIndex: "dayType",
    key: "dayType",
    width: 50,
  },
  {
    title: "DATE C/W mm/dd/yr",
    dataIndex: "dateCW",
    key: "dateCW",
    width: 120,
  },
  {
    title: "HRS C/W",
    dataIndex: "hoursCW",
    key: "hoursCW",
    width: 80,
  },
  {
    title: "DAYS REMAINING",
    dataIndex: "daysRemaining",
    key: "daysRemaining",
    width: 100,
  },
  {
    title: "TIME/CYC REMAINING",
    dataIndex: "timeRemaining",
    key: "timeRemaining",
    width: 120,
  },
  {
    title: "DATE DUE",
    dataIndex: "dateDue",
    key: "dateDue",
    width: 100,
  },
  {
    title: "TT/CYC DUE",
    dataIndex: "ttCycleDue",
    key: "ttCycleDue",
    width: 100,
  },
  {
    title: "DUE",
    dataIndex: "due",
    key: "due",
    width: 60,
  },
  {
    title: "H/D",
    dataIndex: "hd",
    key: "hd",
    width: 60,
  },
  {
    title: "TIME SINCE INSTALLATION",
    dataIndex: "timeSinceInstall",
    key: "timeSinceInstall",
    width: 150,
  },
  {
    title: "TOTAL TIME SINCE NEW",
    dataIndex: "totalTimeSinceNew",
    key: "totalTimeSinceNew",
    width: 150,
  },
];

const data = [
  {
    _id: "1",
    componentName: "AIRWORTHINESS CERTIFICATE",
    hourLimit1: "",
    hourLimit2: "",
    hourLimit3: "",
    dayLimit: "365",
    dayType: "D",
    dateCW: "11/05/24",
    hoursCW: "-126",
    daysRemaining: -126,
    timeRemaining: "",
    dateDue: "11/5/25",
    ttCycleDue: "",
    due: "",
    hd: "",
    timeSinceInstall: "",
    totalTimeSinceNew: "",
  },
  {
    _id: "2",
    componentName: "REGISTRATION CERTIFICATE",
    hourLimit1: "",
    hourLimit2: "",
    hourLimit3: "",
    dayLimit: "365",
    dayType: "D",
    dateCW: "10/10/25",
    hoursCW: "944",
    daysRemaining: 944,
    timeRemaining: "",
    dateDue: "10/10/28",
    ttCycleDue: "",
    due: "",
    hd: "",
    timeSinceInstall: "",
    totalTimeSinceNew: "",
  },
  {
    _id: "3",
    componentName: "RADIO LICENSE",
    hourLimit1: "",
    hourLimit2: "",
    hourLimit3: "",
    dayLimit: "365",
    dayType: "D",
    dateCW: "2/26/25",
    hoursCW: "945",
    daysRemaining: 945,
    timeRemaining: "",
    dateDue: "10/11/28",
    ttCycleDue: "",
    due: "",
    hd: "",
    timeSinceInstall: "",
    totalTimeSinceNew: "",
  },
  {
    _id: "4",
    componentName: "WEIGHT & BALANCE",
    hourLimit1: "",
    hourLimit2: "",
    hourLimit3: "",
    dayLimit: "1825",
    dayType: "D",
    dateCW: "9/21/21",
    hoursCW: "193",
    daysRemaining: 193,
    timeRemaining: "",
    dateDue: "9/20/26",
    ttCycleDue: "",
    due: "",
    hd: "",
    timeSinceInstall: "",
    totalTimeSinceNew: "",
  },
  {
    _id: "5",
    componentName: "FIRST AID KIT PN:8095X900",
    hourLimit1: "",
    hourLimit2: "",
    hourLimit3: "",
    dayLimit: "730",
    dayType: "D",
    dateCW: "10/1/25",
    hoursCW: "569",
    daysRemaining: 569,
    timeRemaining: "",
    dateDue: "10/1/27",
    ttCycleDue: "",
    due: "",
    hd: "",
    timeSinceInstall: "",
    totalTimeSinceNew: "",
  },
  {
    _id: "6",
    componentName: "HAND FIRE EXTINGUISHER BOTTLE PN:S262A10T1001 SN:ACW04964",
    hourLimit1: "",
    hourLimit2: "",
    hourLimit3: "",
    dayLimit: "365",
    dayType: "D",
    dateCW: "8/18/23",
    hoursCW: "2714",
    daysRemaining: 2714,
    timeRemaining: "",
    dateDue: "8/15/33",
    ttCycleDue: "",
    due: "",
    hd: "",
    timeSinceInstall: "",
    totalTimeSinceNew: "",
  },
  {
    _id: "7",
    componentName: "TRANSPONDER CHECK",
    hourLimit1: "",
    hourLimit2: "",
    hourLimit3: "",
    dayLimit: "365",
    dayType: "D",
    dateCW: "5/5/25",
    hoursCW: "55",
    daysRemaining: 55,
    timeRemaining: "",
    dateDue: "5/5/26",
    ttCycleDue: "",
    due: "",
    hd: "",
    timeSinceInstall: "",
    totalTimeSinceNew: "",
  },
  {
    _id: "8",
    componentName: "ELT CHECK",
    hourLimit1: "",
    hourLimit2: "",
    hourLimit3: "",
    dayLimit: "365",
    dayType: "D",
    dateCW: "10/5/25",
    hoursCW: "208",
    daysRemaining: 208,
    timeRemaining: "",
    dateDue: "10/5/26",
    ttCycleDue: "",
    due: "",
    hd: "",
    timeSinceInstall: "",
    totalTimeSinceNew: "",
  },
  {
    _id: "9",
    componentName: "ELT BATTERY PN:704A45737078 SN:LX1101457711",
    hourLimit1: "",
    hourLimit2: "",
    hourLimit3: "",
    dayLimit: "2190",
    dayType: "D",
    dateCW: "10/5/25",
    hoursCW: "1668",
    daysRemaining: 1668,
    timeRemaining: "",
    dateDue: "10/4/30",
    ttCycleDue: "",
    due: "",
    hd: "",
    timeSinceInstall: "",
    totalTimeSinceNew: "",
  },
  {
    _id: "10",
    componentName: "PITOT static check",
    hourLimit1: "",
    hourLimit2: "",
    hourLimit3: "",
    dayLimit: "730",
    dayType: "D",
    dateCW: "10/5/25",
    hoursCW: "573",
    daysRemaining: 573,
    timeRemaining: "",
    dateDue: "10/5/27",
    ttCycleDue: "",
    due: "",
    hd: "",
    timeSinceInstall: "",
    totalTimeSinceNew: "",
  },
];

export default function PartsMonitoring() {
  const [searchText, setSearchText] = React.useState("");
  const [selectedAircraft, setSelectedAircraft] = React.useState("RP-C8912");

  return (
    <div className="parts-monitoring-container">
      {/* Search and Aircraft Select */}
      <Row justify="space-between" align="middle" className="header-row">
        <Col>
          <div className="header-left">
            <Select
              value={selectedAircraft}
              onChange={(value) => setSelectedAircraft(value)}
              style={{ width: 180 }}
            >
              <Option value="RP-C8912">RP-C8912</Option>
            </Select>
            <Button type="primary" icon={<PlusOutlined />}>
              Add Aircraft
            </Button>
          </div>
        </Col>
        <Col>
          <Input
            placeholder="Search..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="search-input"
            allowClear
          />
        </Col>
      </Row>

      {/* Info Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: "16px" }}>
        <Col span={6}>
          <Card className="aircraft-card">
            <div className="card-content">
              <div className="info-item">
                <Text className="info-label">Aircraft: </Text>
                <Text className="info-value">RP-C8912</Text>
              </div>
              <div className="info-item">
                <Text className="info-label">Date Manufactured: </Text>
                <Text className="info-value">DEC 18, 2020</Text>
              </div>
              <div className="info-item">
                <Text className="info-label">Acft. Type: </Text>
                <Text className="info-value">AS350B3 SN: 8904</Text>
              </div>
              <div>
                <Text className="info-label">Creep Damage: </Text>
                <Text className="info-value">0.6%</Text>
              </div>
            </div>
          </Card>
        </Col>
        <Col span={18}>
          <Card className="aircraft-card">
            <div className="input-row">
              <div className="input-group">
                <Text className="card-input-label">Engine Cycle:</Text>
                <Input size="small" className="card-input-field" />
              </div>
              <div className="input-group">
                <Text className="card-input-label">Date:</Text>
                <Input size="small" className="card-input-field" />
              </div>
            </div>
            <div className="input-row">
              <div className="input-group">
                <Text className="card-input-label">N1:</Text>
                <Input size="small" className="card-input-field" />
              </div>
              <div className="input-group">
                <Text className="card-input-label">Eng. TT:</Text>
                <Input size="small" className="card-input-field" />
              </div>
            </div>
            <div className="input-row">
              <div className="input-group">
                <Text className="card-input-label">N2:</Text>
                <Input size="small" className="card-input-field" />
              </div>
              <div className="input-group">
                <Text className="card-input-label">Acft. TT:</Text>
                <Input size="small" className="card-input-field" />
              </div>
            </div>
            <div className="input-row">
              <div className="input-group">
                <Text className="card-input-label">Landings:</Text>
                <Input size="small" className="card-input-field" />
              </div>
              <div className="input-group">
                <Text className="card-input-label">Sling:</Text>
                <Input size="small" className="card-input-field" />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Legend */}
      <Card className="aircraft-card legend-card">
        <div className="legend-container">
          <Text className="note-title">NOTE:</Text>
          <div className="legend-grid">
            <div className="legend-item">
              <Text strong>OC</Text> - ON CONDITION
            </div>
            <div className="legend-item">
              <Text strong>H</Text> - HOURS
            </div>
            <div className="legend-item">
              <Text strong>D</Text> - DAY
            </div>
            <div className="legend-item">
              <span className="status-box status-removed" />
              <Text>- REMOVED</Text>
            </div>
            <div className="legend-item">
              <span className="status-box status-installed" />
              <Text>- INSTALLED</Text>
            </div>
          </div>
        </div>
      </Card>

      {/* Table Section */}
      <div className="table-container">
        <PMonitoringTable
          headers={columnHeader}
          data={data}
          loading={false}
          scroll={{ x: 1500 }}
        />
      </div>
    </div>
  );
}
