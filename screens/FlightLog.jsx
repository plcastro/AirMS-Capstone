import React, { useState, useContext } from "react";
import { View, Text, TextInput, Modal, TouchableOpacity } from "react-native";
import { styles } from "../stylesheets/styles";
import Button from "../components/Button";
import FlightTable from "../components/FlightTable";
import FlightLogEditDefects from "../components/FlightLogEditDefects";
import FlightLogEditTechnical from "../components/FlightLogEditTechnical";
import FlightLogVerifyTechnical from "../components/FlightLogVerifyTechnical";

import Icon from "@mdi/react";
import { mdiGasStation, mdiOil, mdiMapMarkerDistance } from "@mdi/js";
import { AuthContext } from "../Context/AuthContext";
import FlightEntry from "../components/FlightLogEntry";

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

  // Mock Data for Defects - Only 1 entry
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

  // Mock Data for Technical Log - Change to state
  const [technicalLogData, setTechnicalLogData] = useState([
    {
      index: 1,
      tailNum: "---",
      date: "15/03/2026",
      depart: "Pasay",
      arrive: "Mindanao",
      offBlock: "08:25",
      onBlock: "9:35",
      blockTime: "1:25",
      flightTime: "1:20",
      technicalAction: "Routine flight, no issues",
    },
  ]);

  // Card Data for Technical Log Summary
  const cardData = [
    {
      label: "Total Fuel Purchased",
      icon: mdiGasStation,
      value: "46",
    },
    {
      label: "Total Fuel Burned",
      icon: mdiOil,
      value: "5.2",
    },
    {
      label: "Total Leg Distance",
      icon: mdiMapMarkerDistance,
      value: "30 NM",
    },
  ];

  const TLheaders = [
    { label: "#", key: "index" },
    { label: "Tail No.", key: "tailNum" },
    { label: "Date", key: "date" },
    { label: "Depart", key: "depart" },
    { label: "Arrive", key: "arrive" },
    { label: "Off Block", key: "offBlock" },
    { label: "On Block", key: "onBlock" },
    { label: "Block Time", key: "blockTime" },
    { label: "Flight Time", key: "flightTime" },
    { label: "Action", key: "technicalAction" },
  ];

  const Defheaders = [
    { label: "#", key: "index" },
    { label: "Date", key: "date" },
    { label: "Reported by", key: "fullname" },
    { label: "Aircraft", key: "aircraft" },
    { label: "Description", key: "destination" },
    { label: "Action", key: "defectAction" },
  ];

  const TL_COLUMN_WIDTHS = {
    index: 10,
    tailNum: 150,
    date: 150,
    depart: 150,
    arrive: 150,
    offBlock: 150,
    onBlock: 150,
    blockTime: 150,
    flightTime: 150,
    technicalAction: 350,
  };

  const DEF_COLUMN_WIDTHS = {
    index: 10,
    date: 150,
    fullname: 200,
    aircraft: 150,
    destination: 150,
    defectAction: 350,
  };

  // Handler functions for table actions
  const handleEditLog = (log) => {
    console.log("Edit log:", log);
    if (activeTab === "Defects") {
      setSelectedDefect(log);
      setEditDefectModalVisible(true);
    } else if (activeTab === "TechnicalLog") {
      setSelectedTechnicalLog(log);
      setEditTechnicalModalVisible(true);
    }
  };

  const handleDeleteLog = (log) => {
    console.log("Delete log:", log);
    if (activeTab === "Defects") {
      setDefectsData((prev) => prev.filter((item) => item.index !== log.index));
    } else if (activeTab === "TechnicalLog") {
      setTechnicalLogData((prev) =>
        prev.filter((item) => item.index !== log.index),
      );
    }
  };

  const handleShowLog = (log) => {
    console.log("Show log details:", log);
    // For head of maintenance, open verification modal
    if (user?.role === "head of maintenance" && activeTab === "TechnicalLog") {
      setSelectedLogForVerification(log);
      setVerifyDetailsModalVisible(true);
    } else {
      // For other roles, implement show details functionality here
      // You can open a read-only view or different modal
    }
  };

  // Handle saving defect edits
  const handleSaveDefect = (updatedDefect) => {
    setDefectsData((prev) =>
      prev.map((defect) =>
        defect.index === updatedDefect.index ? updatedDefect : defect,
      ),
    );
    setEditDefectModalVisible(false);
    setSelectedDefect(null);
  };

  // Handle saving technical log edits
  const handleSaveTechnicalLog = (updatedLog) => {
    setTechnicalLogData((prev) =>
      prev.map((log) => (log.index === updatedLog.index ? updatedLog : log)),
    );
    setEditTechnicalModalVisible(false);
    setSelectedTechnicalLog(null);
  };

  // Handle approval of technical log (for maintenance)
  const handleApproveTechnicalLog = (verifiedLog) => {
    console.log("Approved technical log:", verifiedLog);
    // Update status in technicalLogData
    setTechnicalLogData((prev) =>
      prev.map((log) =>
        log.index === verifiedLog.index
          ? { ...log, status: "verified", verifiedBy: verifiedLog.verifiedBy }
          : log,
      ),
    );
    setVerifyDetailsModalVisible(false);
    setSelectedLogForVerification(null);
  };

  // Handle new entry creation
  const handleSaveNewEntry = (newEntry) => {
    console.log("New entry:", newEntry);

    if (activeTab === "TechnicalLog") {
      setTechnicalLogData((prev) => {
        const newIndex =
          prev.length > 0 ? Math.max(...prev.map((item) => item.index)) + 1 : 1;
        return [
          ...prev,
          {
            ...newEntry,
            index: newIndex,
            tailNum: newEntry.tailNum || "---",
            date: newEntry.date || new Date().toLocaleDateString(),
            technicalAction: "Submitted for review",
            status: "pending",
          },
        ];
      });
    }
    setModalVisible(false);
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* Search */}
      <View style={[styles.searchRow, { maxWidth: 350 }]}>
        <TextInput
          placeholderTextColor="gray"
          placeholder="Search by date, origin, or destination..."
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Tabs + New Entry */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <View style={{ flexDirection: "row" }}>
          <Button
            label="Defects"
            onPress={() => setActiveTab("Defects")}
            buttonStyle={[
              activeTab === "Defects"
                ? styles.alertConfirmBtn
                : styles.alertCancelBtn,
              { width: 150, marginRight: 10 },
            ]}
            buttonTextStyle={
              activeTab === "Defects"
                ? styles.alertConfirmBtnText
                : styles.alertCancelBtnText
            }
          />

          <Button
            label="Technical Log"
            onPress={() => setActiveTab("TechnicalLog")}
            buttonStyle={[
              activeTab === "TechnicalLog"
                ? styles.alertConfirmBtn
                : styles.alertCancelBtn,
              { width: 150 },
            ]}
            buttonTextStyle={
              activeTab === "TechnicalLog"
                ? styles.alertConfirmBtnText
                : styles.alertCancelBtnText
            }
          />
        </View>

        {/* Only show New Entry button for pilots */}
        {user?.role === "pilot" && (
          <Button
            label="+ New Entry"
            onPress={() => setModalVisible(true)}
            buttonStyle={[{ width: 150 }, styles.alertConfirmBtn]}
            buttonTextStyle={styles.alertConfirmBtnText}
          />
        )}
      </View>

      {/* Content */}
      <View style={{ marginTop: 10 }}>
        {activeTab === "Defects" && (
          <FlightTable
            headers={Defheaders}
            columnWidths={DEF_COLUMN_WIDTHS}
            data={defectsData}
            userRole={user?.role}
            onEditLog={handleEditLog}
            onDeleteLog={handleDeleteLog}
            onShowLog={handleShowLog}
          />
        )}

        {activeTab === "TechnicalLog" && (
          <>
            <View style={{ flexDirection: "row", gap: 30, marginBottom: 10 }}>
              {cardData.map((card, i) => (
                <View
                  key={i}
                  style={{
                    backgroundColor: "#26866F",
                    borderRadius: 8,
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 12,
                    width: 200,
                    height: 100,
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontSize: 16, fontWeight: 500 }}
                  >
                    {card.label}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Icon
                      path={card.icon}
                      size={1.5}
                      color="#fff"
                      style={{ marginRight: 5 }}
                    />
                    <Text
                      style={{ color: "#fff", fontSize: 21, fontWeight: 500 }}
                    >
                      {card.value}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <FlightTable
              headers={TLheaders}
              columnWidths={TL_COLUMN_WIDTHS}
              data={technicalLogData}
              userRole={user?.role}
              onEditLog={handleEditLog}
              onDeleteLog={handleDeleteLog}
              onShowLog={handleShowLog}
            />
          </>
        )}
      </View>

      {/* New Entry Modal - Only for pilots */}
      {user?.role === "pilot" && (
        <FlightEntry
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSave={handleSaveNewEntry}
        />
      )}

      {/* Edit Defect Modal */}
      <FlightLogEditDefects
        visible={editDefectModalVisible}
        entry={selectedDefect}
        onClose={() => {
          setEditDefectModalVisible(false);
          setSelectedDefect(null);
        }}
        onSave={handleSaveDefect}
      />

      {/* Edit Technical Log Modal - Only for pilots */}
      {user?.role === "pilot" && (
        <FlightLogEditTechnical
          visible={editTechnicalModalVisible}
          entry={selectedTechnicalLog}
          onClose={() => {
            setEditTechnicalModalVisible(false);
            setSelectedTechnicalLog(null);
          }}
          onSave={handleSaveTechnicalLog}
        />
      )}

      {/* Verification Modal for Maintenance */}
      <FlightLogVerifyTechnical
        visible={verifyDetailsModalVisible}
        entry={selectedLogForVerification}
        onClose={() => {
          setVerifyDetailsModalVisible(false);
          setSelectedLogForVerification(null);
        }}
        onApprove={handleApproveTechnicalLog}
      />
    </View>
  );
}
