import React, { useState, useContext } from "react";
import { Input, Button, Table, Space, message } from "antd";
import { PlusOutlined, SearchOutlined, ExportOutlined, EditOutlined } from "@ant-design/icons";
import { AuthContext } from "../../../context/AuthContext";
import FlightLogEntry from "../../../components/pagecomponents/FlightLogEntry";
import "./flightlog.css";

// Mock initial data for debugging
const MOCK_INITIAL_LOGS = [
  {
    id: "1",
    _id: "1",
    key: "1",
    aircraftType: "AS350B3",
    rpc: "RP-C1234",
    date: "01/15/2025",
    controlNo: "FL-2025-001",
    status: "pending_release",
    createdBy: "pilot",
    legs: [{ stations: [{ from: "MNL", to: "CEB" }] }],
    remarks: "",
    sling: "",
    fuelServicing: [],
    oilServicing: [],
    workItems: [],
    componentData: {
      broughtForwardData: {},
      thisFlightData: {},
      toDateData: {}
    }
  },
  {
    id: "2",
    _id: "2",
    key: "2",
    aircraftType: "R44",
    rpc: "RP-C5678",
    date: "01/14/2025",
    controlNo: "FL-2025-002",
    status: "pending_acceptance",
    createdBy: "engineer",
    legs: [{ stations: [{ from: "CEB", to: "TAG" }] }],
    remarks: "",
    sling: "",
    fuelServicing: [],
    oilServicing: [],
    workItems: [],
    componentData: {
      broughtForwardData: {},
      thisFlightData: {},
      toDateData: {}
    }
  },
  {
    id: "3",
    _id: "3",
    key: "3",
    aircraftType: "AS350B3",
    rpc: "RP-C1234",
    date: "01/13/2025",
    controlNo: "FL-2025-003",
    status: "completed",
    createdBy: "pilot",
    legs: [{ stations: [{ from: "TAG", to: "MNL" }] }],
    remarks: "Routine maintenance performed",
    sling: "500kg capacity",
    fuelServicing: [],
    oilServicing: [],
    workItems: [],
    componentData: {
      broughtForwardData: {},
      thisFlightData: {},
      toDateData: {}
    }
  }
];

export default function FlightLog() {
  const { user } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAircraft, setSelectedAircraft] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showAircraftDropdown, setShowAircraftDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [flightLogs, setFlightLogs] = useState(MOCK_INITIAL_LOGS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [entryModalVisible, setEntryModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  const userRole = user?.jobTitle?.toLowerCase() || "pilot";

  // Aircraft options from existing logs
  const aircraftOptions = ["all", ...new Set(flightLogs.map((l) => l.rpc).filter(Boolean))];

  // Status options (matching mobile)
  const statusOptions = [
    { label: "All", value: "all" },
    { label: "Pending Release", value: "pending_release" },
    { label: "Pending Acceptance", value: "pending_acceptance" },
    { label: "Released", value: "released" },
    { label: "Accepted", value: "accepted" },
    { label: "Completed", value: "completed" }
  ];

  // Filter logs (client-side, matching mobile logic)
  const filteredLogs = flightLogs.filter((log) => {
    const matchesSearch =
      searchQuery === "" ||
      log.rpc?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.aircraftType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.date?.includes(searchQuery);

    const matchesAircraft =
      selectedAircraft === "" ||
      selectedAircraft === "all" ||
      log.rpc === selectedAircraft;

    const matchesStatus =
      selectedStatus === "all" || log.status === selectedStatus;

    return matchesSearch && matchesAircraft && matchesStatus;
  });

  // Create new flight log
  const handleSaveNew = (data) => {
    setSaving(true);
    try {
      const newId = Date.now().toString() + Math.random().toString(36).substr(2, 6);
      const newLog = {
        ...data,
        id: newId,
        _id: newId,
        key: newId,
        createdBy: userRole,
        status: userRole === "pilot" ? "pending_release" : "pending_acceptance"
      };
      
      setFlightLogs((prev) => [newLog, ...prev]);
      setEntryModalVisible(false);
      message.success("Flight log added successfully");
    } catch (err) {
      message.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Edit/Update flight log
  const handleEdit = (record) => {
    setSelectedLog(record);
    setEditModalVisible(true);
  };

  const handleSaveEdit = (data) => {
    if (!selectedLog?.id) return;
    setSaving(true);
    try {
      const updatedLog = {
        ...selectedLog,
        ...data,
        key: selectedLog.id,
        _id: selectedLog.id
      };
      setFlightLogs((prev) =>
        prev.map((l) => (l.id === selectedLog.id ? updatedLog : l))
      );
      setEditModalVisible(false);
      message.success("Flight log updated successfully");
    } catch (err) {
      message.error(`Failed to update: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = (record) => {
    console.log("Export log:", record);
    message.info(`Export log: ${record.rpc}`);
  };

  // Status badge (matching mobile)
  const getStatusBadge = (status) => {
    if (status === "completed") {
      return <span className="fl-badge fl-badge--completed">Completed</span>;
    }
    return <span className="fl-badge fl-badge--ongoing">Ongoing</span>;
  };

  // Table columns
  const columns = [
    { title: "Aircraft Type", dataIndex: "aircraftType", key: "aircraftType", width: 140 },
    { title: "RP/C", dataIndex: "rpc", key: "rpc", width: 120 },
    { title: "Date", dataIndex: "date", key: "date", width: 100 },
    { title: "Control", dataIndex: "controlNo", key: "controlNo", width: 120, ellipsis: true },
    { title: "Status", key: "status", width: 100, render: (_, r) => getStatusBadge(r.status) },
    {
      title: "Action",
      key: "action",
      width: 110,
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="primary"
            size="small"
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Button
            type="text"
            size="small"
            icon={<ExportOutlined />}
            onClick={() => handleExport(record)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="fl-page">
      {/* Search Bar Row with New Entry Button */}
      <div className="fl-search-row">
        <div className="fl-search-wrapper">
          <Input
            className="fl-search"
            placeholder="Search"
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
          />
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setEntryModalVisible(true)}
          className="fl-new-entry-btn"
        >
          New Entry
        </Button>
      </div>

      {/* Filters Row */}
      <div className="fl-filters-row">
        {/* Aircraft Filter Dropdown */}
        <div className="fl-filter-dropdown">
          <div
            className="fl-filter-selector"
            onClick={() => setShowAircraftDropdown(!showAircraftDropdown)}
          >
            <span className={selectedAircraft && selectedAircraft !== "all" ? "fl-filter-selected" : "fl-filter-placeholder"}>
              {selectedAircraft && selectedAircraft !== "all" ? `RP/C: ${selectedAircraft}` : "Choose Aircraft"}
            </span>
            <span className="fl-filter-arrow">{showAircraftDropdown ? "▲" : "▼"}</span>
          </div>

          {showAircraftDropdown && (
            <div className="fl-dropdown-menu">
              {aircraftOptions.map((aircraft, index) => (
                <div
                  key={index}
                  className="fl-dropdown-item"
                  onClick={() => {
                    setSelectedAircraft(aircraft);
                    setShowAircraftDropdown(false);
                  }}
                >
                  {aircraft === "all" ? "All Aircraft" : `RP/C: ${aircraft}`}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Filter Dropdown */}
        <div className="fl-filter-dropdown" style={{ width: 150 }}>
          <div
            className="fl-filter-selector"
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
          >
            <span className="fl-filter-selected">
              {statusOptions.find((opt) => opt.value === selectedStatus)?.label || "Status"}
            </span>
            <span className="fl-filter-arrow">{showStatusDropdown ? "▲" : "▼"}</span>
          </div>

          {showStatusDropdown && (
            <div className="fl-dropdown-menu">
              {statusOptions.map((option, index) => (
                <div
                  key={index}
                  className="fl-dropdown-item"
                  onClick={() => {
                    setSelectedStatus(option.value);
                    setShowStatusDropdown(false);
                  }}
                >
                  {option.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="fl-table-wrapper">
        <Table
          className="fl-table"
          columns={columns}
          dataSource={filteredLogs}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          size="small"
        />
      </div>

      {/* New Entry Modal */}
      <FlightLogEntry
        visible={entryModalVisible}
        onClose={() => setEntryModalVisible(false)}
        onSave={handleSaveNew}
        userRole={userRole}
        editMode={false}
      />

      {/* Edit Entry Modal */}
      {selectedLog && (
        <FlightLogEntry
          visible={editModalVisible}
          onClose={() => {
            setEditModalVisible(false);
            setSelectedLog(null);
          }}
          onSave={handleSaveEdit}
          userRole={userRole}
          editMode={true}
          initialData={selectedLog}
          initialComponentData={selectedLog.componentData}
        />
      )}
    </div>
  );
}