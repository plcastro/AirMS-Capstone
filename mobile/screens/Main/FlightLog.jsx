import React, { useState, useContext, useEffect } from "react";
import { View, Text, TextInput, Platform, ScrollView } from "react-native";
import { styles } from "../../stylesheets/styles";
import Button from "../../components/Button";

import FlightTable from "../../components/FlightLog/FlightTable";
import FlightLogEditDefects from "../../components/FlightLog/FlightLogEditDefects";
import FlightLogEditTechnical from "../../components/FlightLog/FlightLogEditTechnical";
import FlightLogVerifyTechnical from "../../components/FlightLog/FlightLogVerifyTechnical";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AuthContext } from "../../Context/AuthContext";
import FlightEntry from "../../components/FlightLog/FlightLogEntry";

import { API_BASE } from "../../utilities/API_BASE";
import TechnicalSummaryCards from "../../components/FlightLog/TechnicalSummaryCards";

export default function FlightLog() {
  const { user } = useContext(AuthContext);
  const isMobile = Platform.OS !== "web";
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

  //sets default active tab based on user jobTitle
  useEffect(() => {
    if (user?.jobTitle === "Pilot") {
      setActiveTab("Defects");
    } else {
      setActiveTab("TechnicalLog");
    }
  }, [user?.jobTitle]);

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

  // Technical Log Data - fetched from API
  const [technicalLogData, setTechnicalLogData] = useState([]);

  // Helper function to format decimal hours to H:MM
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
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.status === "Ok") {
          const transformedData = result.data.map((log, index) => {
            return {
              ...log,
              index: index + 1,
              date: log.date || "---",
              offBlock: log.offBlock || "---",
              onBlock: log.onBlock || "---",
              blockTime: formatTime(log.blockTime),
              flightTime: formatTime(log.flightTime),
              technicalAction: "Routine flight, no issues", // Placeholder, adjust as needed
            };
          });
          setTechnicalLogData(transformedData);
        } else {
          console.error("API returned status:", result.status);
        }
      } catch (error) {
        console.error("Error fetching technical logs:", error);
      }
    };
    fetchTechnicalLogs();
  }, []);

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

  // Card Data for Technical Log Summary
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
    index: 20,
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
    if (
      user?.jobTitle === "head of maintenance" &&
      activeTab === "TechnicalLog"
    ) {
      setSelectedLogForVerification(log);
      setVerifyDetailsModalVisible(true);
    } else {
      // For other jobTitles, implement show details functionality here
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
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          placeholderTextColor={"gray"}
          placeholder="Search by date, origin, or destination..."
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      <View style={styles.maintenanceSearchDivider} />
      {/* Tabs + New Entry */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
        }}
      >
        <View style={{ flexDirection: "row" }}>
          {/* Show Defects tab only for pilots */}
          {user?.jobTitle === "pilot" && (
            <Button
              label="Defects"
              onPress={() => setActiveTab("Defects")}
              buttonStyle={[
                activeTab === "Defects"
                  ? styles.primaryBtn
                  : styles.secondaryBtn,
                { width: 150, marginRight: 10 },
              ]}
              buttonTextStyle={
                activeTab === "Defects"
                  ? styles.primaryBtnTxt
                  : styles.secondaryBtnTxt
              }
            />
          )}

          {/* Technical Log tab always visible */}
          <Button
            label="Technical Log"
            onPress={() => setActiveTab("TechnicalLog")}
            buttonStyle={[
              activeTab === "TechnicalLog"
                ? styles.primaryAlertBtn
                : styles.secondaryBtn,
              { width: 150 },
            ]}
            buttonTextStyle={
              activeTab === "TechnicalLog"
                ? styles.primaryBtnTxt
                : styles.secondaryBtnTxt
            }
          />
        </View>

        {user?.jobTitle === "pilot" && (
          <Button
            label="+ New Entry"
            onPress={() => setModalVisible(true)}
            buttonStyle={[{ width: 150 }, styles.primaryAlertBtn]}
            buttonTextStyle={styles.primaryBtnTxt}
          />
        )}
      </View>

      <View style={{ marginTop: 10 }}>
        {activeTab === "Defects" && user?.jobTitle === "pilot" && (
          <FlightTable
            headers={Defheaders}
            columnWidths={DEF_COLUMN_WIDTHS}
            data={defectsData}
            userRole={user?.jobTitle}
            onEditLog={handleEditLog}
            onDeleteLog={handleDeleteLog}
            onShowLog={handleShowLog}
          />
        )}

        {activeTab === "TechnicalLog" && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TechnicalSummaryCards cardData={cardData} isMobile={isMobile} />
            </ScrollView>
            <FlightTable
              headers={TLheaders}
              columnWidths={TL_COLUMN_WIDTHS}
              data={technicalLogData}
              userRole={user?.jobTitle}
              onEditLog={handleEditLog}
              onDeleteLog={handleDeleteLog}
              onShowLog={handleShowLog}
            />
          </>
        )}
      </View>

      {/* New Entry Modal - Only for pilots */}
      {user?.jobTitle === "pilot" && (
        <FlightEntry
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSave={handleSaveNewEntry}
          jobTitle={"pilot"}
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
      {user?.jobTitle === "pilot" && (
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
