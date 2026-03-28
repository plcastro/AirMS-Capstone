import React, { useState, useContext, useEffect } from "react";
import {
  Tabs,
  Input,
  Button,
  Table,
  Space,
  Modal,
  message,
  Tag,
  Row,
  Col,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  ExportOutlined,
  CloseOutlined,
  PlusOutlined as PlusIcon,
  MinusOutlined,
} from "@ant-design/icons";
import { AuthContext } from "../../../context/AuthContext";
import { flightLogsMockData } from "../../../components/pagecomponents/FlightLogMockData";
import "./flightlog.css";

const { TabPane } = Tabs;
const { TextArea } = Input;

export default function FlightLog() {
  const { user } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("TechnicalLog");
  const [flightLogs, setFlightLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [newEntryModalVisible, setNewEntryModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  // New Entry Form State
  const [newEntryCurrentTab, setNewEntryCurrentTab] = useState("0");
  const [newEntryFormData, setNewEntryFormData] = useState({
    aircraftType: "",
    rpc: "",
    date: new Date(),
    controlNo: "",
    legs: [
      {
        stations: [{ from: "", to: "" }],
        blockTimeOn: "",
        blockTimeOff: "",
        flightTimeOn: "",
        flightTimeOff: "",
        totalTimeOn: "",
        totalTimeOff: "",
        date: "",
        passengers: "",
      },
    ],
    remarks: "",
    sling: "",
    workItems: [],
  });
  const [newEntryComponentData, setNewEntryComponentData] = useState({
    broughtForwardData: {
      airframe: "",
      gearBoxMain: "",
      gearBoxTail: "",
      rotorMain: "",
      rotorTail: "",
      airframeNextInsp: "",
      engine: "",
      cycleN1: "",
      cycleN2: "",
      usage: "",
      landingCycle: "",
      engineNextInsp: "",
    },
    thisFlightData: {},
    toDateData: {},
  });

  // Edit Form State
  const [editCurrentTab, setEditCurrentTab] = useState("0");
  const [editFormData, setEditFormData] = useState(null);
  const [editComponentData, setEditComponentData] = useState(null);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [pin, setPin] = useState("");
  const [signatureStep, setSignatureStep] = useState("pin");

  const userRole = user?.jobTitle?.toLowerCase() || "pilot";
  const isPilot = userRole === "pilot";
  const isMechanic =
    userRole === "engineer" || userRole === "maintenance manager";

  useEffect(() => {
    const transformed = flightLogsMockData.map((log, index) => ({
      ...log,
      key: log.id,
      index: index + 1,
    }));
    setFlightLogs(transformed);
    setLoading(false);
  }, []);

  const filteredLogs = flightLogs.filter((log) => {
    const matchesSearch =
      searchQuery === "" ||
      log.rpc?.includes(searchQuery) ||
      log.aircraftType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.date?.includes(searchQuery);
    return matchesSearch;
  });

  // Helper functions
  const hasDiscrepancy = (data) => {
    return data.remarks && data.remarks.trim() !== "";
  };

  const getTabsByRole = (
    isPilotRole,
    hasDisc,
    isEdit = false,
    existingData = null,
  ) => {
    if (isPilotRole) {
      if (isEdit && existingData?.status === "pending_release") {
        return ["Basic Information", "Destination/s", "Discrepancy/Remarks"];
      }
      return ["Basic Information", "Destination/s", "Discrepancy/Remarks"];
    } else {
      const tabs = [
        "Basic Information",
        "Component Times",
        "Fuel Servicing",
        "Oil Servicing",
        "Discrepancy/Remarks",
      ];
      if (hasDisc) {
        tabs.push("Work Done");
      }
      return tabs;
    }
  };

  // New Entry Functions
  const updateNewEntryForm = (field, value) => {
    setNewEntryFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateNewEntryLeg = (legIndex, field, value) => {
    const newLegs = [...newEntryFormData.legs];
    newLegs[legIndex] = { ...newLegs[legIndex], [field]: value };
    setNewEntryFormData((prev) => ({ ...prev, legs: newLegs }));
  };

  const addNewEntryLeg = () => {
    const newLeg = {
      stations: [{ from: "", to: "" }],
      blockTimeOn: "",
      blockTimeOff: "",
      flightTimeOn: "",
      flightTimeOff: "",
      totalTimeOn: "",
      totalTimeOff: "",
      date: "",
      passengers: "",
    };
    setNewEntryFormData((prev) => ({ ...prev, legs: [...prev.legs, newLeg] }));
  };

  const removeNewEntryLeg = (legIndex) => {
    if (newEntryFormData.legs.length > 1) {
      const newLegs = [...newEntryFormData.legs];
      newLegs.splice(legIndex, 1);
      setNewEntryFormData((prev) => ({ ...prev, legs: newLegs }));
    }
  };

  const addNewEntryStation = (legIndex) => {
    const newLegs = [...newEntryFormData.legs];
    const lastStation =
      newLegs[legIndex].stations[newLegs[legIndex].stations.length - 1];
    newLegs[legIndex].stations.push({ from: lastStation.to, to: "" });
    setNewEntryFormData((prev) => ({ ...prev, legs: newLegs }));
  };

  const removeNewEntryStation = (legIndex, stationIndex) => {
    const newLegs = [...newEntryFormData.legs];
    if (newLegs[legIndex].stations.length > 1) {
      newLegs[legIndex].stations.splice(stationIndex, 1);
      setNewEntryFormData((prev) => ({ ...prev, legs: newLegs }));
    }
  };

  const updateNewEntryStation = (legIndex, stationIndex, field, value) => {
    const newLegs = [...newEntryFormData.legs];
    newLegs[legIndex].stations[stationIndex][field] = value;

    if (
      field === "to" &&
      stationIndex < newLegs[legIndex].stations.length - 1
    ) {
      newLegs[legIndex].stations[stationIndex + 1].from = value;
    }
    if (field === "from" && stationIndex > 0) {
      newLegs[legIndex].stations[stationIndex - 1].to = value;
    }

    setNewEntryFormData((prev) => ({ ...prev, legs: newLegs }));
  };

  const handleNewEntryNext = () => {
    const tabs = getTabsByRole(isPilot, hasDiscrepancy(newEntryFormData));
    if (parseInt(newEntryCurrentTab) < tabs.length - 1) {
      setNewEntryCurrentTab(String(parseInt(newEntryCurrentTab) + 1));
    }
  };

  const handleNewEntryPrevious = () => {
    if (parseInt(newEntryCurrentTab) > 0) {
      setNewEntryCurrentTab(String(parseInt(newEntryCurrentTab) - 1));
    }
  };

  const handleNewEntrySave = () => {
    const aircraft = newEntryFormData.rpc || "Aircraft";
    const msg = isPilot
      ? `Flight log has been added for ${aircraft}. Wait for the mechanic to release it.`
      : `Flight log has been added for ${aircraft}. Wait for pilot to accept.`;

    message.success(msg);

    const newEntry = {
      ...newEntryFormData,
      newEntryComponentData,
      id: Date.now().toString(),
      key: Date.now().toString(),
      index: flightLogs.length + 1,
      date: newEntryFormData.date.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      }),
      dateAdded: new Date().toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      }),
      status: isPilot ? "pending_release" : "pending_acceptance",
      createdBy: userRole,
      aircraftType: newEntryFormData.aircraftType,
      rpc: newEntryFormData.rpc,
      control: newEntryFormData.controlNo,
    };

    setFlightLogs((prev) => [newEntry, ...prev]);
    setNewEntryModalVisible(false);
    resetNewEntryForm();
  };

  const resetNewEntryForm = () => {
    setNewEntryCurrentTab("0");
    setNewEntryFormData({
      aircraftType: "",
      rpc: "",
      date: new Date(),
      controlNo: "",
      legs: [
        {
          stations: [{ from: "", to: "" }],
          blockTimeOn: "",
          blockTimeOff: "",
          flightTimeOn: "",
          flightTimeOff: "",
          totalTimeOn: "",
          totalTimeOff: "",
          date: "",
          passengers: "",
        },
      ],
      remarks: "",
      sling: "",
      workItems: [],
    });
    setNewEntryComponentData({
      broughtForwardData: {
        airframe: "",
        gearBoxMain: "",
        gearBoxTail: "",
        rotorMain: "",
        rotorTail: "",
        airframeNextInsp: "",
        engine: "",
        cycleN1: "",
        cycleN2: "",
        usage: "",
        landingCycle: "",
        engineNextInsp: "",
      },
      thisFlightData: {},
      toDateData: {},
    });
  };

  // Edit Functions
  const handleEdit = (record) => {
    setSelectedLog(record);
    setEditFormData(record);
    setEditComponentData(
      record.componentData || {
        broughtForwardData: {},
        thisFlightData: {},
        toDateData: {},
      },
    );
    setEditCurrentTab("0");
    setEditModalVisible(true);
  };

  const updateEditForm = (field, value) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateEditLeg = (legIndex, field, value) => {
    const newLegs = [...editFormData.legs];
    newLegs[legIndex] = { ...newLegs[legIndex], [field]: value };
    setEditFormData((prev) => ({ ...prev, legs: newLegs }));
  };

  const addEditLeg = () => {
    const newLeg = {
      stations: [{ from: "", to: "" }],
      blockTimeOn: "",
      blockTimeOff: "",
      flightTimeOn: "",
      flightTimeOff: "",
      totalTimeOn: "",
      totalTimeOff: "",
      date: "",
      passengers: "",
    };
    setEditFormData((prev) => ({ ...prev, legs: [...prev.legs, newLeg] }));
  };

  const removeEditLeg = (legIndex) => {
    if (editFormData.legs.length > 1) {
      const newLegs = [...editFormData.legs];
      newLegs.splice(legIndex, 1);
      setEditFormData((prev) => ({ ...prev, legs: newLegs }));
    }
  };

  const addEditStation = (legIndex) => {
    const newLegs = [...editFormData.legs];
    const lastStation =
      newLegs[legIndex].stations[newLegs[legIndex].stations.length - 1];
    newLegs[legIndex].stations.push({ from: lastStation.to, to: "" });
    setEditFormData((prev) => ({ ...prev, legs: newLegs }));
  };

  const removeEditStation = (legIndex, stationIndex) => {
    const newLegs = [...editFormData.legs];
    if (newLegs[legIndex].stations.length > 1) {
      newLegs[legIndex].stations.splice(stationIndex, 1);
      setEditFormData((prev) => ({ ...prev, legs: newLegs }));
    }
  };

  const updateEditStation = (legIndex, stationIndex, field, value) => {
    const newLegs = [...editFormData.legs];
    newLegs[legIndex].stations[stationIndex][field] = value;

    if (
      field === "to" &&
      stationIndex < newLegs[legIndex].stations.length - 1
    ) {
      newLegs[legIndex].stations[stationIndex + 1].from = value;
    }
    if (field === "from" && stationIndex > 0) {
      newLegs[legIndex].stations[stationIndex - 1].to = value;
    }

    setEditFormData((prev) => ({ ...prev, legs: newLegs }));
  };

  const handleEditNext = () => {
    const hasDisc = hasDiscrepancy(editFormData);
    const tabs = getTabsByRole(isPilot, hasDisc, true, editFormData);
    if (parseInt(editCurrentTab) < tabs.length - 1) {
      setEditCurrentTab(String(parseInt(editCurrentTab) + 1));
    }
  };

  const handleEditPrevious = () => {
    if (parseInt(editCurrentTab) > 0) {
      setEditCurrentTab(String(parseInt(editCurrentTab) - 1));
    }
  };

  const handleRelease = () => {
    setShowReleaseModal(true);
  };

  const handleAccept = () => {
    setShowAcceptModal(true);
  };

  const handlePinSubmit = () => {
    if (pin.length === 4) {
      setSignatureStep("signature");
    } else {
      message.error("Please enter a 4-digit PIN");
    }
  };

  const handleSignatureSave = (signature) => {
    if (showReleaseModal) {
      const updatedLog = {
        ...editFormData,
        status: "ongoing",
        releasedBy: {
          name: "Mechanic",
          signature,
          timestamp: new Date().toISOString(),
        },
      };
      setFlightLogs((prev) =>
        prev.map((log) => (log.id === updatedLog.id ? updatedLog : log)),
      );
      message.success("Flight log has been released");
    } else if (showAcceptModal) {
      const updatedLog = {
        ...editFormData,
        status: "ongoing",
        acceptedBy: {
          name: "Pilot",
          signature,
          timestamp: new Date().toISOString(),
        },
      };
      setFlightLogs((prev) =>
        prev.map((log) => (log.id === updatedLog.id ? updatedLog : log)),
      );
      message.success("Flight log has been accepted");
    }
    setShowReleaseModal(false);
    setShowAcceptModal(false);
    setPin("");
    setSignatureStep("pin");
    setEditModalVisible(false);
  };

  const handleNotifyMechanic = () => {
    const updatedLog = {
      ...editFormData,
      notifiedForCompletion: true,
    };
    setFlightLogs((prev) =>
      prev.map((log) => (log.id === updatedLog.id ? updatedLog : log)),
    );
    message.success("Mechanic has been notified to complete the flight log");
  };

  const handleComplete = () => {
    const updatedLog = {
      ...editFormData,
      status: "completed",
    };
    setFlightLogs((prev) =>
      prev.map((log) => (log.id === updatedLog.id ? updatedLog : log)),
    );
    message.success("Flight log has been marked as completed");
    setEditModalVisible(false);
  };

  const handleEditSave = () => {
    setFlightLogs((prev) =>
      prev.map((log) => (log.id === editFormData.id ? editFormData : log)),
    );
    setEditModalVisible(false);
    message.success("Flight log updated successfully");
  };

  const handleExport = (record) => {
    message.info(`Export log: ${record.rpc}`);
  };

  // Render Functions
  const renderBasicInfo = (data, updateFn, isEditable) => (
    <div className="flightlog-form">
      <div className="flightlog-form-row">
        <label className="flightlog-form-label">Aircraft Type:</label>
        <Input
          value={data.aircraftType}
          onChange={(e) => updateFn("aircraftType", e.target.value)}
          placeholder="Select Aircraft Type"
          disabled={!isEditable}
        />
      </div>
      <div className="flightlog-form-row">
        <label className="flightlog-form-label">RP-C:</label>
        <Input
          value={data.rpc}
          onChange={(e) => updateFn("rpc", e.target.value)}
          placeholder="Select RP/C"
          disabled={!isEditable}
        />
      </div>
      <div className="flightlog-form-row">
        <label className="flightlog-form-label">Date:</label>
        <Input
          value={
            data.date instanceof Date
              ? data.date.toLocaleDateString()
              : data.date
          }
          disabled
        />
      </div>
      <div className="flightlog-form-row">
        <label className="flightlog-form-label">Control No.:</label>
        <Input
          value={data.controlNo}
          onChange={(e) => updateFn("controlNo", e.target.value)}
          placeholder="Enter control number"
          disabled={!isEditable}
        />
      </div>
    </div>
  );

  const renderDestinations = (
    data,
    updateLegFn,
    addLegFn,
    removeLegFn,
    addStationFn,
    removeStationFn,
    updateStationFn,
    legs,
    isEditable,
  ) => (
    <div className="flightlog-destinations">
      {legs.map((leg, legIdx) => {
        const legNumber = legIdx + 1;
        const suffix =
          legNumber === 1
            ? "st"
            : legNumber === 2
              ? "nd"
              : legNumber === 3
                ? "rd"
                : "th";

        return (
          <div key={legIdx} className="flightlog-leg-card">
            <div className="flightlog-leg-header">
              <span>
                {legNumber}
                {suffix} Leg
              </span>
              {isEditable && legs.length > 1 && (
                <Button
                  type="text"
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => removeLegFn(legIdx)}
                />
              )}
            </div>
            <div className="flightlog-leg-content">
              <label className="flightlog-form-label">Station</label>
              {leg.stations.map((station, stationIdx) => (
                <div key={stationIdx} className="flightlog-station-row">
                  <Input
                    className="flightlog-station-input"
                    value={station.from}
                    onChange={(e) =>
                      updateStationFn(
                        legIdx,
                        stationIdx,
                        "from",
                        e.target.value,
                      )
                    }
                    placeholder="From"
                    disabled={!isEditable}
                  />
                  <span className="flightlog-station-separator">-</span>
                  <Input
                    className="flightlog-station-input"
                    value={station.to}
                    onChange={(e) =>
                      updateStationFn(legIdx, stationIdx, "to", e.target.value)
                    }
                    placeholder="To"
                    disabled={!isEditable}
                  />
                  {isEditable && leg.stations.length > 1 && (
                    <Button
                      type="text"
                      icon={<MinusOutlined />}
                      onClick={() => removeStationFn(legIdx, stationIdx)}
                    />
                  )}
                </div>
              ))}

              {isEditable && (
                <Button
                  type="dashed"
                  block
                  icon={<PlusIcon />}
                  onClick={() => addStationFn(legIdx)}
                >
                  Add Station
                </Button>
              )}

              <div className="flightlog-time-section">
                <h4>Time Information</h4>
                <div className="flightlog-form-row">
                  <label>Block Time (ON):</label>
                  <Input
                    value={leg.blockTimeOn}
                    onChange={(e) =>
                      updateLegFn(legIdx, "blockTimeOn", e.target.value)
                    }
                    disabled={!isEditable}
                  />
                </div>
                <div className="flightlog-form-row">
                  <label>Block Time (OFF):</label>
                  <Input
                    value={leg.blockTimeOff}
                    onChange={(e) =>
                      updateLegFn(legIdx, "blockTimeOff", e.target.value)
                    }
                    disabled={!isEditable}
                  />
                </div>
                <div className="flightlog-form-row">
                  <label>Flight Time (ON):</label>
                  <Input
                    value={leg.flightTimeOn}
                    onChange={(e) =>
                      updateLegFn(legIdx, "flightTimeOn", e.target.value)
                    }
                    disabled={!isEditable}
                  />
                </div>
                <div className="flightlog-form-row">
                  <label>Flight Time (OFF):</label>
                  <Input
                    value={leg.flightTimeOff}
                    onChange={(e) =>
                      updateLegFn(legIdx, "flightTimeOff", e.target.value)
                    }
                    disabled={!isEditable}
                  />
                </div>
                <div className="flightlog-form-row">
                  <label>Total Time (ON):</label>
                  <Input
                    value={leg.totalTimeOn}
                    onChange={(e) =>
                      updateLegFn(legIdx, "totalTimeOn", e.target.value)
                    }
                    disabled={!isEditable}
                  />
                </div>
                <div className="flightlog-form-row">
                  <label>Total Time (OFF):</label>
                  <Input
                    value={leg.totalTimeOff}
                    onChange={(e) =>
                      updateLegFn(legIdx, "totalTimeOff", e.target.value)
                    }
                    disabled={!isEditable}
                  />
                </div>
                <div className="flightlog-form-row">
                  <label>Date:</label>
                  <Input
                    value={leg.date}
                    onChange={(e) =>
                      updateLegFn(legIdx, "date", e.target.value)
                    }
                    placeholder="MM/DD/YYYY"
                    disabled={!isEditable}
                  />
                </div>
                <div className="flightlog-form-row">
                  <label>Passengers:</label>
                  <Input
                    value={leg.passengers}
                    onChange={(e) =>
                      updateLegFn(legIdx, "passengers", e.target.value)
                    }
                    disabled={!isEditable}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
      {isEditable && (
        <Button type="dashed" block icon={<PlusIcon />} onClick={addLegFn}>
          Add Leg
        </Button>
      )}
    </div>
  );

  const renderDiscrepancy = (
    remarks,
    sling,
    updateRemarksFn,
    updateSlingFn,
    isEditable,
  ) => (
    <div className="flightlog-form">
      <div className="flightlog-form-row">
        <label className="flightlog-form-label">Discrepancy/Remarks:</label>
        <TextArea
          rows={4}
          value={remarks}
          onChange={(e) => updateRemarksFn(e.target.value)}
          placeholder="Enter any discrepancies or remarks"
          disabled={!isEditable}
        />
      </div>
      <div className="flightlog-form-row">
        <label className="flightlog-form-label">Sling:</label>
        <TextArea
          rows={4}
          value={sling}
          onChange={(e) => updateSlingFn(e.target.value)}
          placeholder="Enter sling information"
          disabled={!isEditable}
        />
      </div>
    </div>
  );

  const getStatusBadge = (status) => {
    if (status === "completed") {
      return <Tag color="green">Completed</Tag>;
    }
    if (status === "pending_release") {
      return <Tag color="orange">Pending Release</Tag>;
    }
    if (status === "pending_acceptance") {
      return <Tag color="orange">Pending Acceptance</Tag>;
    }
    return <Tag color="blue">Ongoing</Tag>;
  };

  const getCreatedByBadge = (createdBy) => {
    if (createdBy === "pilot") {
      return <Tag color="blue">Pilot Created</Tag>;
    }
    return <Tag color="purple">Mechanic Created</Tag>;
  };

  const columns = [
    { title: "#", dataIndex: "index", key: "index", width: 60 },
    { title: "Tail No.", dataIndex: "rpc", key: "rpc", width: 100 },
    {
      title: "Aircraft Type",
      dataIndex: "aircraftType",
      key: "aircraftType",
      width: 120,
    },
    { title: "Date", dataIndex: "date", key: "date", width: 100 },
    {
      title: "Control",
      dataIndex: "control",
      key: "control",
      width: 150,
      ellipsis: true,
    },
    {
      title: "Status",
      key: "status",
      width: 120,
      render: (_, record) => getStatusBadge(record.status),
    },
    {
      title: "Created By",
      key: "createdBy",
      width: 120,
      render: (_, record) => getCreatedByBadge(record.createdBy),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            style={{ color: "#26866F" }}
          />
          <Button
            type="link"
            icon={<ExportOutlined />}
            onClick={() => handleExport(record)}
            style={{ color: "#26866F" }}
          />
        </Space>
      ),
    },
  ];

  // New Entry Modal Tabs
  const newEntryTabs = getTabsByRole(isPilot, hasDiscrepancy(newEntryFormData));
  const newEntryCurrentIndex = parseInt(newEntryCurrentTab);
  const isNewEntryLastTab = newEntryCurrentIndex === newEntryTabs.length - 1;

  // Edit Modal Tabs
  const editTabs = editFormData
    ? getTabsByRole(isPilot, hasDiscrepancy(editFormData), true, editFormData)
    : [];
  const editCurrentIndex = parseInt(editCurrentTab);
  const isEditLastTab = editCurrentIndex === editTabs.length - 1;

  const canEditBasicInfo =
    (isPilot && editFormData?.createdBy === "pilot") ||
    (isMechanic && editFormData?.createdBy === "mechanic");
  const canEditDestinations =
    (isPilot && editFormData?.createdBy === "pilot") ||
    (isPilot && editFormData?.createdBy === "mechanic");
  const canEditComponent = isMechanic && !editFormData?.broughtForwardLocked;
  const canEditFuelOil = isMechanic;
  const canEditDiscrepancy = true;
  const canEditWorkDone = isMechanic;

  const showReleaseButton =
    isMechanic && editFormData?.status === "pending_release";
  const showAcceptButton =
    isPilot && editFormData?.status === "pending_acceptance";
  const showNotifyButton =
    isPilot &&
    editFormData?.status === "ongoing" &&
    !editFormData?.notifiedForCompletion;
  const showCompleteButton =
    isMechanic &&
    editFormData?.status === "ongoing" &&
    editFormData?.notifiedForCompletion;

  return (
    <div className="flightlog-container">
      <Row>
        <Col xs={24} md={8}>
          <Input
            placeholder="Search by date, origin, or destination..."
            value={searchQuery}
            size="large"
            onChange={(e) => setSearchQuery(e.target.value)}
            prefix={<SearchOutlined />}
            allowClear
          />
        </Col>
      </Row>

      {isPilot && (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setNewEntryModalVisible(true)}
          className="flightlog-new-entry-btn"
        >
          New Entry
        </Button>
      )}

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        className="flightlog-tabs"
      >
        {isPilot && (
          <TabPane tab="Defects" key="Defects">
            <Table
              columns={columns}
              dataSource={filteredLogs}
              loading={loading}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              className="flightlog-table"
              scroll={{ x: "max-content" }}
            />
          </TabPane>
        )}
        <TabPane tab="Technical Log" key="TechnicalLog">
          <Table
            columns={columns}
            dataSource={filteredLogs}
            loading={loading}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            className="flightlog-table"
            scroll={{ x: "max-content" }}
          />
        </TabPane>
      </Tabs>

      {/* New Entry Modal */}
      <Modal
        title="New Flight Log Entry"
        open={newEntryModalVisible}
        onCancel={() => setNewEntryModalVisible(false)}
        footer={null}
        width={800}
        className="flightlog-modal"
        destroyOnHidden
      >
        <Tabs
          activeKey={newEntryCurrentTab}
          onChange={setNewEntryCurrentTab}
          className="flightlog-modal-tabs"
        >
          {newEntryTabs.map((tab) => (
            <TabPane tab={tab} key={tab} />
          ))}
        </Tabs>

        <div
          style={{
            minHeight: 400,
            maxHeight: 500,
            overflowY: "auto",
            padding: "16px 0",
          }}
        >
          {newEntryTabs[newEntryCurrentIndex] === "Basic Information" &&
            renderBasicInfo(newEntryFormData, updateNewEntryForm, true)}
          {newEntryTabs[newEntryCurrentIndex] === "Destination/s" &&
            renderDestinations(
              newEntryFormData,
              updateNewEntryLeg,
              addNewEntryLeg,
              removeNewEntryLeg,
              addNewEntryStation,
              removeNewEntryStation,
              updateNewEntryStation,
              newEntryFormData.legs,
              true,
            )}
          {newEntryTabs[newEntryCurrentIndex] === "Component Times" && (
            <div className="flightlog-form">
              <h3>Brought Forward</h3>
              <div className="flightlog-form-row">
                <label>A/Frame:</label>
                <Input placeholder="Enter A/Frame" />
              </div>
            </div>
          )}
          {newEntryTabs[newEntryCurrentIndex] === "Fuel Servicing" && (
            <div className="flightlog-form">
              {newEntryFormData.legs.map((leg, idx) => (
                <div key={idx} className="flightlog-leg-card">
                  <div className="flightlog-leg-header">
                    {idx + 1}
                    {idx === 0
                      ? "st"
                      : idx === 1
                        ? "nd"
                        : idx === 2
                          ? "rd"
                          : "th"}{" "}
                    Leg
                  </div>
                  <div className="flightlog-leg-content">
                    <div className="flightlog-form-row">
                      <label>Date:</label>
                      <Input placeholder="MM/DD/YYYY" />
                    </div>
                    <div className="flightlog-form-row">
                      <label>Cont Check:</label>
                      <Input />
                    </div>
                    <div className="flightlog-form-row">
                      <label>Main (REM/G):</label>
                      <Input />
                    </div>
                    <div className="flightlog-form-row">
                      <label>Main (ADD):</label>
                      <Input />
                    </div>
                    <div className="flightlog-form-row">
                      <label>Main (TOTAL):</label>
                      <Input />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {newEntryTabs[newEntryCurrentIndex] === "Oil Servicing" && (
            <div className="flightlog-form">
              {newEntryFormData.legs.map((leg, idx) => (
                <div key={idx} className="flightlog-leg-card">
                  <div className="flightlog-leg-header">
                    {idx + 1}
                    {idx === 0
                      ? "st"
                      : idx === 1
                        ? "nd"
                        : idx === 2
                          ? "rd"
                          : "th"}{" "}
                    Leg
                  </div>
                  <div className="flightlog-leg-content">
                    <div className="flightlog-form-row">
                      <label>Date:</label>
                      <Input placeholder="MM/DD/YYYY" />
                    </div>
                    <div className="flightlog-form-row">
                      <label>Engine (REM):</label>
                      <Input />
                    </div>
                    <div className="flightlog-form-row">
                      <label>Engine (ADD):</label>
                      <Input />
                    </div>
                    <div className="flightlog-form-row">
                      <label>Engine (TOT):</label>
                      <Input />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {newEntryTabs[newEntryCurrentIndex] === "Discrepancy/Remarks" &&
            renderDiscrepancy(
              newEntryFormData.remarks,
              newEntryFormData.sling,
              (val) => updateNewEntryForm("remarks", val),
              (val) => updateNewEntryForm("sling", val),
              true,
            )}
          {newEntryTabs[newEntryCurrentIndex] === "Work Done" && (
            <div className="flightlog-form">
              <div className="flightlog-checkbox-group">
                <label className="flightlog-checkbox">
                  <input type="checkbox" /> Discrepancy Correction
                </label>
                <label className="flightlog-checkbox">
                  <input type="checkbox" /> SB/AD Compliance
                </label>
                <label className="flightlog-checkbox">
                  <input type="checkbox" /> Inspection
                </label>
                <label className="flightlog-checkbox">
                  <input type="checkbox" /> Others
                </label>
              </div>
              <div className="flightlog-form-row">
                <label>Date:</label>
                <Input placeholder="MM/DD/YYYY" />
              </div>
              <div className="flightlog-form-row">
                <label>Aircraft/T/:</label>
                <Input />
              </div>
              <div className="flightlog-form-row">
                <label>Work Done:</label>
                <TextArea rows={3} />
              </div>
              <div className="flightlog-form-row">
                <label>Name:</label>
                <Input />
              </div>
              <div className="flightlog-form-row">
                <label>Certificate Number:</label>
                <Input />
              </div>
              <Button type="dashed" block icon={<PlusIcon />}>
                Add Work Done
              </Button>
            </div>
          )}
        </div>

        <div className="flightlog-pagination">
          <button
            className="prev-btn"
            onClick={handleNewEntryPrevious}
            disabled={newEntryCurrentIndex === 0}
          >
            Previous
          </button>
          <span className="page-number">{newEntryCurrentIndex + 1}</span>
          {!isNewEntryLastTab ? (
            <button className="next-btn" onClick={handleNewEntryNext}>
              Next
            </button>
          ) : (
            <button className="next-btn" onClick={handleNewEntrySave}>
              Add
            </button>
          )}
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title={`Edit Flight Log - ${editFormData?.rpc || ""}`}
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
        width={800}
        className="flightlog-modal"
        destroyOnHidden
      >
        {editFormData && (
          <>
            <Tabs
              activeKey={editCurrentTab}
              onChange={setEditCurrentTab}
              className="flightlog-modal-tabs"
            >
              {editTabs.map((tab) => (
                <TabPane tab={tab} key={tab} />
              ))}
            </Tabs>

            <div
              style={{
                minHeight: 400,
                maxHeight: 500,
                overflowY: "auto",
              }}
            >
              {editTabs[editCurrentIndex] === "Basic Information" &&
                renderBasicInfo(editFormData, updateEditForm, canEditBasicInfo)}
              {editTabs[editCurrentIndex] === "Destination/s" &&
                renderDestinations(
                  editFormData,
                  updateEditLeg,
                  addEditLeg,
                  removeEditLeg,
                  addEditStation,
                  removeEditStation,
                  updateEditStation,
                  editFormData.legs,
                  canEditDestinations,
                )}
              {editTabs[editCurrentIndex] === "Component Times" && (
                <div className="flightlog-form">
                  <h3>
                    Brought Forward{" "}
                    {editFormData.broughtForwardLocked && (
                      <Tag color="red">Locked</Tag>
                    )}
                  </h3>
                  <div className="flightlog-form-row">
                    <label>A/Frame:</label>
                    <Input
                      value={
                        editComponentData?.broughtForwardData?.airframe || ""
                      }
                      onChange={(e) =>
                        setEditComponentData((prev) => ({
                          ...prev,
                          broughtForwardData: {
                            ...prev.broughtForwardData,
                            airframe: e.target.value,
                          },
                        }))
                      }
                      disabled={!canEditComponent}
                    />
                  </div>
                  <div className="flightlog-form-row">
                    <label>Gear Box (MAIN):</label>
                    <Input
                      value={
                        editComponentData?.broughtForwardData?.gearBoxMain || ""
                      }
                      onChange={(e) =>
                        setEditComponentData((prev) => ({
                          ...prev,
                          broughtForwardData: {
                            ...prev.broughtForwardData,
                            gearBoxMain: e.target.value,
                          },
                        }))
                      }
                      disabled={!canEditComponent}
                    />
                  </div>
                </div>
              )}
              {editTabs[editCurrentIndex] === "Fuel Servicing" && (
                <div className="flightlog-form">
                  {editFormData.legs?.map((leg, idx) => (
                    <div key={idx} className="flightlog-leg-card">
                      <div className="flightlog-leg-header">
                        {idx + 1}
                        {idx === 0
                          ? "st"
                          : idx === 1
                            ? "nd"
                            : idx === 2
                              ? "rd"
                              : "th"}{" "}
                        Leg
                      </div>
                      <div className="flightlog-leg-content">
                        <div className="flightlog-form-row">
                          <label>Date:</label>
                          <Input
                            placeholder="MM/DD/YYYY"
                            disabled={!canEditFuelOil}
                          />
                        </div>
                        <div className="flightlog-form-row">
                          <label>Cont Check:</label>
                          <Input disabled={!canEditFuelOil} />
                        </div>
                        <div className="flightlog-form-row">
                          <label>Main (REM/G):</label>
                          <Input disabled={!canEditFuelOil} />
                        </div>
                        <div className="flightlog-form-row">
                          <label>Main (ADD):</label>
                          <Input disabled={!canEditFuelOil} />
                        </div>
                        <div className="flightlog-form-row">
                          <label>Main (TOTAL):</label>
                          <Input disabled={!canEditFuelOil} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {editTabs[editCurrentIndex] === "Oil Servicing" && (
                <div className="flightlog-form">
                  {editFormData.legs?.map((leg, idx) => (
                    <div key={idx} className="flightlog-leg-card">
                      <div className="flightlog-leg-header">
                        {idx + 1}
                        {idx === 0
                          ? "st"
                          : idx === 1
                            ? "nd"
                            : idx === 2
                              ? "rd"
                              : "th"}{" "}
                        Leg
                      </div>
                      <div className="flightlog-leg-content">
                        <div className="flightlog-form-row">
                          <label>Date:</label>
                          <Input
                            placeholder="MM/DD/YYYY"
                            disabled={!canEditFuelOil}
                          />
                        </div>
                        <div className="flightlog-form-row">
                          <label>Engine (REM):</label>
                          <Input disabled={!canEditFuelOil} />
                        </div>
                        <div className="flightlog-form-row">
                          <label>Engine (ADD):</label>
                          <Input disabled={!canEditFuelOil} />
                        </div>
                        <div className="flightlog-form-row">
                          <label>Engine (TOT):</label>
                          <Input disabled={!canEditFuelOil} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {editTabs[editCurrentIndex] === "Discrepancy/Remarks" &&
                renderDiscrepancy(
                  editFormData.remarks,
                  editFormData.sling,
                  (val) => updateEditForm("remarks", val),
                  (val) => updateEditForm("sling", val),
                  canEditDiscrepancy,
                )}
              {editTabs[editCurrentIndex] === "Work Done" && (
                <div className="flightlog-form">
                  <div className="flightlog-checkbox-group">
                    <label className="flightlog-checkbox">
                      <input type="checkbox" disabled={!canEditWorkDone} />{" "}
                      Discrepancy Correction
                    </label>
                    <label className="flightlog-checkbox">
                      <input type="checkbox" disabled={!canEditWorkDone} />{" "}
                      SB/AD Compliance
                    </label>
                    <label className="flightlog-checkbox">
                      <input type="checkbox" disabled={!canEditWorkDone} />{" "}
                      Inspection
                    </label>
                    <label className="flightlog-checkbox">
                      <input type="checkbox" disabled={!canEditWorkDone} />{" "}
                      Others
                    </label>
                  </div>
                  <div className="flightlog-form-row">
                    <label>Date:</label>
                    <Input
                      placeholder="MM/DD/YYYY"
                      disabled={!canEditWorkDone}
                    />
                  </div>
                  <div className="flightlog-form-row">
                    <label>Aircraft/T/:</label>
                    <Input disabled={!canEditWorkDone} />
                  </div>
                  <div className="flightlog-form-row">
                    <label>Work Done:</label>
                    <TextArea rows={3} disabled={!canEditWorkDone} />
                  </div>
                  <div className="flightlog-form-row">
                    <label>Name:</label>
                    <Input disabled={!canEditWorkDone} />
                  </div>
                  <div className="flightlog-form-row">
                    <label>Certificate Number:</label>
                    <Input disabled={!canEditWorkDone} />
                  </div>
                  {canEditWorkDone && (
                    <Button type="dashed" block icon={<PlusIcon />}>
                      Add Work Done
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="flightlog-pagination">
              <button
                className="prev-btn"
                onClick={handleEditPrevious}
                disabled={editCurrentIndex === 0}
              >
                Previous
              </button>
              <span className="page-number">{editCurrentIndex + 1}</span>
              {!isEditLastTab ? (
                <button className="next-btn" onClick={handleEditNext}>
                  Next
                </button>
              ) : (
                <button className="next-btn" onClick={handleEditSave}>
                  Save
                </button>
              )}
            </div>

            {/* Action Buttons on Last Page */}
            {isEditLastTab && (
              <div
                style={{
                  marginTop: 20,
                  padding: "16px 24px",
                  borderTop: "1px solid #e8e8e8",
                }}
              >
                {showReleaseButton && (
                  <Button
                    type="primary"
                    style={{ backgroundColor: "#26866F", width: "100%" }}
                    onClick={handleRelease}
                  >
                    Release
                  </Button>
                )}
                {showAcceptButton && (
                  <Button
                    type="primary"
                    style={{ backgroundColor: "#26866F", width: "100%" }}
                    onClick={handleAccept}
                  >
                    Accept
                  </Button>
                )}
                {showNotifyButton && (
                  <Button
                    type="primary"
                    style={{ backgroundColor: "#26866F", width: "100%" }}
                    onClick={handleNotifyMechanic}
                  >
                    Notify Mechanic for Completing Flights
                  </Button>
                )}
                {showCompleteButton && (
                  <Button
                    type="primary"
                    style={{ backgroundColor: "#26866F", width: "100%" }}
                    onClick={handleComplete}
                  >
                    Complete
                  </Button>
                )}

                {editFormData.releasedBy?.signature && (
                  <div className="flightlog-signature-card">
                    <div className="flightlog-signature-header">
                      RELEASED BY:
                    </div>
                    <div className="flightlog-signature-content">
                      <div>{editFormData.releasedBy.name}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        {new Date(
                          editFormData.releasedBy.timestamp,
                        ).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}

                {editFormData.acceptedBy?.signature && (
                  <div className="flightlog-signature-card">
                    <div className="flightlog-signature-header">
                      ACCEPTED BY:
                    </div>
                    <div className="flightlog-signature-content">
                      <div>{editFormData.acceptedBy.name}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        {new Date(
                          editFormData.acceptedBy.timestamp,
                        ).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </Modal>

      {/* Release/Accept Signature Modal */}
      <Modal
        title={showReleaseModal ? "Release Signature" : "Accept Signature"}
        open={showReleaseModal || showAcceptModal}
        onCancel={() => {
          setShowReleaseModal(false);
          setShowAcceptModal(false);
          setPin("");
          setSignatureStep("pin");
        }}
        footer={null}
        width={400}
      >
        {signatureStep === "pin" ? (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <h3>
              Do you want to sign this flight log for RP-
              {editFormData?.rpc || "7627"}?
            </h3>
            <p>Enter PIN to sign</p>
            <Input.Password
              placeholder="PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              maxLength={4}
              style={{ textAlign: "center", marginBottom: 20 }}
            />
            <Space>
              <Button
                onClick={() => {
                  setShowReleaseModal(false);
                  setShowAcceptModal(false);
                  setPin("");
                }}
              >
                CANCEL
              </Button>
              <Button type="primary" onClick={handlePinSubmit}>
                SUBMIT
              </Button>
            </Space>
          </div>
        ) : (
          <div style={{ padding: "20px" }}>
            <p>Please sign below:</p>
            <div
              style={{
                height: 200,
                border: "1px dashed #ccc",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
                background: "#f5f5f5",
              }}
            >
              <span style={{ color: "#999" }}>Signature Pad Placeholder</span>
            </div>
            <Space style={{ width: "100%", justifyContent: "space-between" }}>
              <Button onClick={() => setSignatureStep("pin")}>Back</Button>
              <Button
                type="primary"
                onClick={() => handleSignatureSave("mock_signature")}
              >
                Save
              </Button>
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
}
