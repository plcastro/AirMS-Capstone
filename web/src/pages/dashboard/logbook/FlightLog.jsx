import React, { useState, useEffect, useContext } from "react";
import { Button, Input, Tabs, Space } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import FLogTable from "../../../components/tables/FLogTable";

import { AuthContext } from "../../../context/AuthContext";
// import FlightLogEditDefects from "../../components/FlightLog/FlightLogEditDefects";
// import FlightLogEditTechnical from "../../components/FlightLog/FlightLogEditTechnical";
// import FlightLogVerifyTechnical from "../../components/FlightLog/FlightLogVerifyTechnical";
// import FlightEntry from "../../components/FlightLog/FlightLogEntry";

export default function FlightLog() {
  const { user } = useContext(AuthContext);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Defects");

  const [modalVisible, setModalVisible] = useState(false);
  const [editDefectModalVisible, setEditDefectModalVisible] = useState(false);
  const [editTechnicalModalVisible, setEditTechnicalModalVisible] =
    useState(false);
  const [verifyDetailsModalVisible, setVerifyDetailsModalVisible] =
    useState(false);

  const [selectedDefect, setSelectedDefect] = useState(null);
  const [selectedTechnicalLog, setSelectedTechnicalLog] = useState(null);
  const [selectedLogForVerification, setSelectedLogForVerification] =
    useState(null);

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

  useEffect(() => {
    if (user?.jobTitle === "Pilot") {
      setActiveTab("Defects");
    } else {
      setActiveTab("TechnicalLog");
    }
  }, [user?.jobTitle]);

  const formatTime = (decimalTime) => {
    if (!decimalTime || decimalTime <= 0) return "---";
    const hours = Math.floor(decimalTime);
    const minutes = Math.round((decimalTime - hours) * 60);
    return `${hours}:${minutes.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    const fetchTechnicalLogs = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/technical-logs/getAllTechnicalLogs`,
        );

        const result = await response.json();

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

  const handleEditLog = (log) => {
    if (activeTab === "Defects") {
      setSelectedDefect(log);
      setEditDefectModalVisible(true);
    } else {
      setSelectedTechnicalLog(log);
      setEditTechnicalModalVisible(true);
    }
  };

  const handleDeleteLog = (log) => {
    if (activeTab === "Defects") {
      setDefectsData((prev) => prev.filter((item) => item.index !== log.index));
    } else {
      setTechnicalLogData((prev) =>
        prev.filter((item) => item.index !== log.index),
      );
    }
  };

  const handleShowLog = (log) => {
    if (
      user?.jobTitle === "head of maintenance" &&
      activeTab === "TechnicalLog"
    ) {
      setSelectedLogForVerification(log);
      setVerifyDetailsModalVisible(true);
    }
  };

  const handleSaveDefect = (updatedDefect) => {
    setDefectsData((prev) =>
      prev.map((defect) =>
        defect.index === updatedDefect.index ? updatedDefect : defect,
      ),
    );
    setEditDefectModalVisible(false);
  };

  const handleSaveTechnicalLog = (updatedLog) => {
    setTechnicalLogData((prev) =>
      prev.map((log) => (log.index === updatedLog.index ? updatedLog : log)),
    );
    setEditTechnicalModalVisible(false);
  };

  const handleApproveTechnicalLog = (verifiedLog) => {
    setTechnicalLogData((prev) =>
      prev.map((log) =>
        log.index === verifiedLog.index ? { ...log, status: "verified" } : log,
      ),
    );

    setVerifyDetailsModalVisible(false);
  };

  const handleSaveNewEntry = (newEntry) => {
    if (activeTab === "TechnicalLog") {
      setTechnicalLogData((prev) => [
        ...prev,
        { ...newEntry, index: prev.length + 1 },
      ]);
    }

    setModalVisible(false);
  };

  return (
    <div>
      <Input
        placeholder="Search by date, origin, or destination..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{ width: 350, marginBottom: 10 }}
      />

      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        {user?.jobTitle === "pilot" && (
          <Button label="Defects" onClick={() => setActiveTab("Defects")} />
        )}

        <Button
          label="Technical Log"
          onClick={() => setActiveTab("TechnicalLog")}
        />

        {user?.jobTitle === "pilot" && (
          <Button label="+ New Entry" onClick={() => setModalVisible(true)} />
        )}
      </div>

      {activeTab === "Defects" && (
        <FLogTable
          data={defectsData}
          onEditLog={handleEditLog}
          onDeleteLog={handleDeleteLog}
          onShowLog={handleShowLog}
        />
      )}

      {activeTab === "TechnicalLog" && (
        <>
          <div style={{ overflowX: "auto" }}>
            <TechnicalSummaryCards />
          </div>

          <FLogTable
            data={technicalLogData}
            onEditLog={handleEditLog}
            onDeleteLog={handleDeleteLog}
            onShowLog={handleShowLog}
          />
        </>
      )}

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
