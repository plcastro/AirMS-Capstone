import React, { useState, useEffect } from "react";
import { View, TextInput, Text } from "react-native";
import TableMaintenance from "../components/MaintenanceTable";
import Button from "../components/Button";
import MaintenanceNewEntry from "../components/MaintenanceNewEntry";
import MaintenanceEditEntry from "../components/MaintenanceEditEntry";
import { Picker } from "@react-native-picker/picker";
import { styles } from "../stylesheets/styles";

export default function MaintenanceLog() {
  const [allEntries, setAllEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [showEditEntry, setShowEditEntry] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [aircraftFilter, setAircraftFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const headers = [
    { label: "Aircraft", key: "aircraft" },
    { label: "Defects", key: "defects" },
    { label: "Date Defect Discovered", key: "dateDefectDiscovered" },
    { label: "Corrective Action Done", key: "correctiveActionDone" },
    { label: "Date Defect Rectified", key: "dateDefectRectified" },
    { label: "Action", key: "action" },
    { label: "Status", key: "status" },
  ];

  const COLUMN_WIDTHS = {
    aircraft: 100,
    defects: 250,
    dateDefectDiscovered: 150,
    correctiveActionDone: 200,
    dateDefectRectified: 150,
    action: 100,
    status: 100,
  };

  const mockData = [
    {
      id: 1,
      aircraft: "2810",
      defects: "Oxygen pressure low in main cabin supply system",
      dateDefectDiscovered: "01/04/2026",
      correctiveActionDone: "Fixed area and replaced seal",
      dateDefectRectified: "01/05/2026",
      status: "Verified",
    },
    {
      id: 2,
      aircraft: "2810",
      defects: "Aileron control surface failure during pre-flight check",
      dateDefectDiscovered: "01/08/2026",
      correctiveActionDone: "N/A",
      dateDefectRectified: "N/A",
      status: "Unverified",
    },
    {
      id: 3,
      aircraft: "2810",
      defects: "Airframe dented on left wing due to ground equipment contact",
      dateDefectDiscovered: "01/03/2026",
      correctiveActionDone: "Inspected and scheduled for repair",
      dateDefectRectified: "01/10/2026",
      status: "Verified",
    },
    {
      id: 4,
      aircraft: "2811",
      defects: "Engine oil leak detected during post-flight inspection",
      dateDefectDiscovered: "02/15/2026",
      correctiveActionDone: "Replaced main oil seal and tested",
      dateDefectRectified: "02/20/2026",
      status: "Verified",
    },
    {
      id: 5,
      aircraft: "2812",
      defects: "Landing gear sensor intermittent failure readings",
      dateDefectDiscovered: "01/01/2026",
      correctiveActionDone: "N/A",
      dateDefectRectified: "N/A",
      status: "Unverified",
    },
  ];

  const calculateStatus = (entry) => {
    const hasRealCorrectiveAction =
      entry.correctiveActionDone &&
      entry.correctiveActionDone !== "N/A" &&
      entry.correctiveActionDone.trim() !== "";
    const hasRealRectifiedDate =
      entry.dateDefectRectified &&
      entry.dateDefectRectified !== "N/A" &&
      entry.dateDefectRectified.trim() !== "";

    if (hasRealCorrectiveAction && hasRealRectifiedDate) {
      return "Verified";
    }
    return "Unverified";
  };

  const parseDate = (dateString) => {
    if (!dateString || dateString === "N/A") return null;
    const [month, day, year] = dateString.split("/");
    return new Date(year, month - 1, day);
  };

  const fetchEntries = async () => {
    try {
      const entriesWithCalculatedStatus = mockData.map((entry) => ({
        ...entry,
        status: calculateStatus(entry),
      }));

      setAllEntries(entriesWithCalculatedStatus);
      setFilteredEntries(entriesWithCalculatedStatus);
    } catch (error) {
      console.error("Error fetching maintenance entries:", error);
      setAllEntries([]);
      setFilteredEntries([]);
    }
  };

  useEffect(() => {
    let filtered = [...allEntries];

    if (statusFilter !== "all") {
      filtered = filtered.filter((entry) => entry.status === statusFilter);
    }

    if (aircraftFilter !== "all") {
      filtered = filtered.filter((entry) => entry.aircraft === aircraftFilter);
    }

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (entry) =>
          (entry.aircraft && entry.aircraft.toLowerCase().includes(query)) ||
          (entry.defects && entry.defects.toLowerCase().includes(query)) ||
          (entry.correctiveActionDone &&
            entry.correctiveActionDone.toLowerCase().includes(query)) ||
          (entry.dateDefectDiscovered &&
            entry.dateDefectDiscovered.toLowerCase().includes(query)) ||
          (entry.dateDefectRectified &&
            entry.dateDefectRectified.toLowerCase().includes(query)),
      );
    }

    setFilteredEntries(filtered);
  }, [allEntries, statusFilter, aircraftFilter, searchQuery]);

  const handleEditEntry = (entry) => {
    setSelectedEntry(entry);
    setShowEditEntry(true);
  };

  const handleUpdateEntry = (updatedEntry) => {
    const finalEntry = {
      ...updatedEntry,
      status: calculateStatus(updatedEntry),
    };

    setAllEntries((prev) =>
      prev.map((entry) => (entry.id === finalEntry.id ? finalEntry : entry)),
    );
    setShowEditEntry(false);
    setSelectedEntry(null);
  };

  const handleSaveNewEntry = (MaintenanceNewEntry) => {
    const today = new Date();
    const todayFormatted = `${(today.getMonth() + 1).toString().padStart(2, "0")}/${today.getDate().toString().padStart(2, "0")}/${today.getFullYear()}`;

    const entryToAdd = {
      id: allEntries.length + 1,
      aircraft: MaintenanceNewEntry.aircraft,
      defects: MaintenanceNewEntry.defectDescription,
      dateDefectDiscovered:
        MaintenanceNewEntry.dateDefectDiscovered || todayFormatted,
      correctiveActionDone: "N/A",
      dateDefectRectified: "N/A",
      status: "Unverified",
    };

    setAllEntries((prev) => [...prev, entryToAdd]);
    setShowNewEntry(false);
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
  };

  const uniqueAircraft = [
    "all",
    ...new Set(allEntries.map((entry) => entry.aircraft)),
  ];

  useEffect(() => {
    fetchEntries();
  }, []);

  return (
    <View style={styles.maintenanceTableContainer}>
      <View style={styles.maintenanceSearchRow}>
        <TextInput
          placeholder="Search by aircraft, defects, date, or corrective action..."
          style={styles.maintenanceSearchInput}
          value={searchQuery}
          onChangeText={handleSearchChange}
        />

        <View style={styles.maintenanceAircraftFilter}>
          <Picker
            selectedValue={aircraftFilter}
            onValueChange={(itemValue) => setAircraftFilter(itemValue)}
            style={styles.maintenanceFilterPicker}
            mode="dropdown"
          >
            <Picker.Item label="Choose aircraft" value="all" />
            {uniqueAircraft
              .filter((aircraft) => aircraft !== "all")
              .map((aircraft, index) => (
                <Picker.Item key={index} label={aircraft} value={aircraft} />
              ))}
          </Picker>
        </View>

        <View style={styles.maintenanceFilter}>
          <Picker
            selectedValue={statusFilter}
            onValueChange={(itemValue) => setStatusFilter(itemValue)}
            style={styles.maintenanceFilterPicker}
            mode="dropdown"
          >
            <Picker.Item label="Status" value="all" />
            <Picker.Item label="Verified" value="Verified" />
            <Picker.Item label="Unverified" value="Unverified" />
          </Picker>
        </View>
      </View>

      <View style={styles.maintenanceSearchDivider} />

      <View style={styles.maintenanceHistoryHeader}>
        <View style={styles.maintenanceHistoryTitleWithBg}>
          <Text style={styles.maintenanceHistoryTitle}>
            Maintenance History
          </Text>
        </View>
        <Button
          iconName="plus"
          label="New Entry"
          buttonStyle={styles.maintenanceAddButton}
          buttonTextStyle={styles.maintenanceAddButtonText}
          onPress={() => setShowNewEntry(true)}
        />
      </View>

      <View style={styles.maintenanceLogCount}>
        <Text style={styles.maintenanceLogCountText}>
          Showing {filteredEntries.length} of {allEntries.length} maintenance
          entries
          {statusFilter !== "all" && ` (${statusFilter} only)`}
          {aircraftFilter !== "all" && ` (Aircraft ${aircraftFilter} only)`}
        </Text>
      </View>

      <TableMaintenance
        data={filteredEntries}
        headers={headers}
        columnWidths={COLUMN_WIDTHS}
        onEditEntry={handleEditEntry}
      />

      <MaintenanceNewEntry
        visible={showNewEntry}
        onClose={() => setShowNewEntry(false)}
        onSave={handleSaveNewEntry}
      />

      <MaintenanceEditEntry
        visible={showEditEntry}
        entry={selectedEntry}
        onClose={() => {
          setShowEditEntry(false);
          setSelectedEntry(null);
        }}
        onSave={handleUpdateEntry}
      />
    </View>
  );
}
