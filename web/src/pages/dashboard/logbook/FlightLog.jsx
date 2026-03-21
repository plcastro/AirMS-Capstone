import React, { useState, useEffect, useContext } from "react";
import { Tabs, Input, Row, Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import FLogTable from "../../../components/tables/FLogTable";

import { AuthContext } from "../../../context/AuthContext";
import TechnicalSummaryCards from "../../../components/pagecomponents/TechnicalSummaryCards";
import FlightEntry from "../../../components/pagecomponents/FlightLogEntry";
import FlightLogEditDefects from "../../../components/pagecomponents/FlightLogEditDefects";
import FlightLogEditTechnical from "../../../components/pagecomponents/FlightLogEditTechnical";
import FlightLogVerifyTechnical from "../../../components/pagecomponents/FlightLogVerifyTechnical";

import { API_BASE } from "../../../utils/API_BASE";

export default function FlightLog() {
  const { user } = useContext(AuthContext);

  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [modalVisible, setModalVisible] = useState(false);
  const [editDefectModalVisible, setEditDefectModalVisible] = useState(false);
  const [editTechnicalModalVisible, setEditTechnicalModalVisible] =
    useState(false);
  const [verifyDetailsModalVisible, setVerifyDetailsModalVisible] =
    useState(false);

  // Selected rows
  const [selectedDefect, setSelectedDefect] = useState(null);
  const [selectedTechnicalLog, setSelectedTechnicalLog] = useState(null);
  const [selectedLogForVerification, setSelectedLogForVerification] =
    useState(null);

  // Data
  const [defectsData, setDefectsData] = useState([
    {
      index: 1,
      date: "01/03/2026",
      fullname: "Max Verstappen",
      aircraft: "2810",
      destination: "Oxygen pressure lower than normal",
      defectAction: "Required - Ground inspection needed",
    },
  ]);

  const [technicalLogData, setTechnicalLogData] = useState([]);
  // Technical summary cards
  const totalFuelPurchased = technicalLogData.reduce(
    (sum, log) => sum + (log.fuelPurchased || 0),
    0,
  );
  const totalFuelBurned = technicalLogData.reduce(
    (sum, log) => sum + (log.fuelBurn || 0),
    0,
  );
  const totalLegDistance = technicalLogData.reduce(
    (sum, log) => sum + (log.legDistance || 0),
    0,
  );

  const cardData = [
    {
      label: "Total Fuel Purchased",
      icon: "fuel",
      value: totalFuelPurchased.toString(),
    },
    {
      label: "Total Fuel Burned",
      icon: "oil",
      value: totalFuelBurned.toString(),
    },
    {
      label: "Total Leg Distance",
      icon: "map-marker-distance",
      value: `${totalLegDistance} NM`,
    },
  ];

  const TLheaders = [
    { title: "#", dataIndex: "index", key: "index" },
    { title: "Tail No.", dataIndex: "tailNum", key: "tailNum" },
    { title: "Date", dataIndex: "date", key: "date" },
    { title: "Depart", dataIndex: "depart", key: "depart" },
    { title: "Arrive", dataIndex: "arrive", key: "arrive" },
    { title: "Off Block", dataIndex: "offBlock", key: "offBlock" },
    { title: "On Block", dataIndex: "onBlock", key: "onBlock" },
    { title: "Block Time", dataIndex: "blockTime", key: "blockTime" },
    { title: "Flight Time", dataIndex: "flightTime", key: "flightTime" },
    { title: "Action", key: "action" },
  ];

  const Defheaders = [
    { title: "#", dataIndex: "index", key: "index" },
    { title: "Date", dataIndex: "date", key: "date" },
    { title: "Reported by", dataIndex: "fullname", key: "fullname" },
    { title: "Aircraft", dataIndex: "aircraft", key: "aircraft" },
    { title: "Description", dataIndex: "destination", key: "destination" },
    { title: "Action", key: "action" },
  ];

  const tabItems = [];

  if (user?.jobTitle === "pilot") {
    tabItems.push(
      {
        key: "Defects",
        label: "Defects",
        children: (
          <FLogTable
            headers={Defheaders}
            data={defectsData}
            userJobTitle={user?.jobTitle}
            onEditLog={(log) => handleEditLog(log, "Defects")}
            onDeleteLog={(log) => handleDeleteLog(log, "Defects")}
            onShowLog={(log) => handleShowLog(log, "Defects")}
          />
        ),
      },
      {
        key: "TechnicalLog",
        label: "Technical Log",
        children: (
          <>
            <Row style={{ overflowX: "auto", marginBottom: 16 }}>
              <TechnicalSummaryCards cardData={cardData} />
            </Row>
            <FLogTable
              headers={TLheaders}
              data={technicalLogData}
              userJobTitle={user?.jobTitle}
              onEditLog={(log) => handleEditLog(log, "TechnicalLog")}
              onDeleteLog={(log) => handleDeleteLog(log, "TechnicalLog")}
              onShowLog={(log) => handleShowLog(log, "TechnicalLog")}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              style={{ marginTop: 10 }}
              onClick={() => setModalVisible(true)}
            >
              New Entry
            </Button>
          </>
        ),
      },
    );
  } else if (user?.jobTitle === "maintenance manager") {
    tabItems.push({
      key: "TechnicalLog",
      label: "Technical Log",
      children: (
        <>
          <Row style={{ overflowX: "auto", marginBottom: 16 }}>
            <TechnicalSummaryCards cardData={cardData} />
          </Row>
          <FLogTable
            headers={TLheaders}
            data={technicalLogData}
            userJobTitle={user?.jobTitle}
            onEditLog={(log) => handleEditLog(log, "TechnicalLog")}
            onDeleteLog={(log) => handleDeleteLog(log, "TechnicalLog")}
            onShowLog={(log) => handleShowLog(log, "TechnicalLog")}
          />
        </>
      ),
    });
  }

  const formatTime = (decimalTime) => {
    if (!decimalTime || decimalTime <= 0) return "---";
    const hours = Math.floor(decimalTime);
    const minutes = Math.round((decimalTime - hours) * 60);
    return `${hours}:${minutes.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    // Fetch technical logs
    const fetchTechnicalLogs = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/technical-logs/getAllTechnicalLogs`,
        );
        const result = await res.json();

        if (result.status === "Ok") {
          const transformed = result.data.map((log, index) => ({
            ...log,
            index: index + 1,
            blockTime: formatTime(log.blockTime),
            flightTime: formatTime(log.flightTime),
          }));
          setTechnicalLogData(transformed);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchTechnicalLogs();
  }, []);

  // Handlers
  const handleEditLog = (log, type) => {
    if (type === "Defects") {
      setSelectedDefect(log);
      setEditDefectModalVisible(true);
    } else {
      setSelectedTechnicalLog(log);
      setEditTechnicalModalVisible(true);
    }
  };

  const handleDeleteLog = (log, type) => {
    if (type === "Defects") {
      setDefectsData((prev) => prev.filter((item) => item.index !== log.index));
    } else {
      setTechnicalLogData((prev) =>
        prev.filter((item) => item.index !== log.index),
      );
    }
  };

  const handleShowLog = (log, type) => {
    if (type === "TechnicalLog" && user?.jobTitle === "head of maintenance") {
      setSelectedLogForVerification(log);
      setVerifyDetailsModalVisible(true);
    }
  };

  const handleSaveNewEntry = (newEntry) => {
    setTechnicalLogData((prev) => [
      ...prev,
      { ...newEntry, index: prev.length + 1 },
    ]);
    setModalVisible(false);
  };

  const handleSaveDefect = (updatedDefect) => {
    setDefectsData((prev) =>
      prev.map((d) => (d.index === updatedDefect.index ? updatedDefect : d)),
    );
    setEditDefectModalVisible(false);
  };

  const handleSaveTechnicalLog = (updatedLog) => {
    setTechnicalLogData((prev) =>
      prev.map((l) => (l.index === updatedLog.index ? updatedLog : l)),
    );
    setEditTechnicalModalVisible(false);
  };

  const handleApproveTechnicalLog = (verifiedLog) => {
    setTechnicalLogData((prev) =>
      prev.map((l) =>
        l.index === verifiedLog.index ? { ...l, status: "verified" } : l,
      ),
    );
    setVerifyDetailsModalVisible(false);
  };

  return (
    <div>
      <Input
        placeholder="Search by date, origin, or destination..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{ width: 350, marginBottom: 16 }}
      />

      <Tabs
        defaultActiveKey={tabItems[0]?.key || "TechnicalLog"}
        items={tabItems}
      />

      <FlightEntry
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveNewEntry}
      />
      <FlightLogEditDefects
        visible={editDefectModalVisible}
        entry={selectedDefect}
        onClose={() => setEditDefectModalVisible(false)}
        onSave={handleSaveDefect}
      />
      <FlightLogEditTechnical
        visible={editTechnicalModalVisible}
        entry={selectedTechnicalLog}
        onClose={() => setEditTechnicalModalVisible(false)}
        onSave={handleSaveTechnicalLog}
      />
      <FlightLogVerifyTechnical
        visible={verifyDetailsModalVisible}
        entry={selectedLogForVerification}
        onClose={() => setVerifyDetailsModalVisible(false)}
        onApprove={handleApproveTechnicalLog}
      />
    </div>
  );
}
