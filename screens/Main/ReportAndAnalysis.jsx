import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from "react-native";
import { styles } from "../../stylesheets/styles";

const mockData = [
  {
    id: "1",
    aircraft: "A320",
    component: "Engine",
    date: "2025-01-12",
    status: "Completed",
  },
  {
    id: "2",
    aircraft: "B737",
    component: "Landing Gear",
    date: "2025-02-05",
    status: "Overdue",
  },
  {
    id: "3",
    aircraft: "A320",
    component: "Avionics",
    date: "2025-02-15",
    status: "Completed",
  },
  {
    id: "4",
    aircraft: "B777",
    component: "Engine",
    date: "2025-03-01",
    status: "Due Soon",
  },
];

export default function ReportAndAnalysis() {
  const [searchQuery, setSearchQuery] = useState("");
  const [aircraftFilter, setAircraftFilter] = useState("");
  const [componentFilter, setComponentFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // Filtering Logic
  const filteredData = useMemo(() => {
    return mockData.filter((item) => {
      const matchesSearch =
        item.aircraft.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.component.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesAircraft = item.aircraft
        .toLowerCase()
        .includes(aircraftFilter.toLowerCase());

      const matchesComponent = item.component
        .toLowerCase()
        .includes(componentFilter.toLowerCase());

      const matchesDate = item.date.includes(dateFilter);

      return (
        matchesSearch && matchesAircraft && matchesComponent && matchesDate
      );
    });
  }, [searchQuery, aircraftFilter, componentFilter, dateFilter]);

  const totalTasks = filteredData.length;
  const completedTasks = filteredData.filter(
    (item) => item.status === "Completed",
  ).length;
  const overdueTasks = filteredData.filter(
    (item) => item.status === "Overdue",
  ).length;

  const handleExport = () => {
    console.log("Exporting data:", filteredData);
    // Later connect to CSV/PDF export
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* SEARCH + EXPORT */}
      <View style={styles.topRow}>
        <TextInput
          placeholder="Search by Aircraft or Component..."
          placeholderTextColor={"gray"}
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
          <Text style={styles.exportText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* FILTER SECTION */}
      <View style={styles.filterContainer}>
        <TextInput
          placeholder="Filter by Aircraft"
          placeholderTextColor={"gray"}
          style={styles.filterInput}
          value={aircraftFilter}
          onChangeText={setAircraftFilter}
        />

        <TextInput
          placeholder="Filter by Component"
          placeholderTextColor={"gray"}
          style={styles.filterInput}
          value={componentFilter}
          onChangeText={setComponentFilter}
        />

        <TextInput
          placeholder="Filter by Date (YYYY-MM-DD)"
          placeholderTextColor={"gray"}
          style={styles.filterInput}
          value={dateFilter}
          onChangeText={setDateFilter}
        />
      </View>

      {/* SUMMARY CARDS */}
      <View style={styles.cardRow}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Total Tasks</Text>
          <Text style={styles.cardValue}>{totalTasks}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Completed</Text>
          <Text style={styles.cardValue}>{completedTasks}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Overdue</Text>
          <Text style={styles.cardValue}>{overdueTasks}</Text>
        </View>
      </View>

      {/* MAINTENANCE PERFORMANCE */}
      <View style={styles.performanceContainer}>
        <Text style={styles.sectionTitle}>Maintenance Performance</Text>

        <View style={styles.chartPlaceholder}>
          <Text style={{ color: "#999" }}>Line Chart Goes Here</Text>
        </View>
      </View>

      {/* FILTERED TASK LIST */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <Text style={styles.listTitle}>
              {item.aircraft} • {item.component}
            </Text>
            <Text style={styles.listSub}>
              {item.date} • {item.status}
            </Text>
          </View>
        )}
      />
    </ScrollView>
  );
}
