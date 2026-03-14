import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import MechanicAssignment from "./MechanicAssignment";
import TaskInfo from "../../components/TaskAssignment/TaskInfo";
import { styles } from "../../stylesheets/styles";
import { COLORS } from "../../stylesheets/colors";

const { width } = Dimensions.get("window");

// Base mechanic data without status (will be calculated)
const BASE_MECHANICS_DATA = [
  { id: "1", name: "John Doe", avatar: null },
  { id: "2", name: "Clara Bang", avatar: null },
  { id: "3", name: "Joe Bloggs", avatar: null },
  { id: "4", name: "Max Miller", avatar: null },
  { id: "5", name: "Liam Brown", avatar: null },
  { id: "6", name: "Dilan Wolf", avatar: null },
  { id: "7", name: "Bob Rosfield", avatar: null },
];

export default function MechanicList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMechanic, setSelectedMechanic] = useState(null);

  // Use tasks from TaskInfo
  const tasks = TaskInfo;

  // Calculate mechanic status based on task count
  const getMechanicStatus = (mechanicId) => {
    const taskCount = tasks.filter(
      (task) => task.assignedTo === mechanicId,
    ).length;
    // Busy if 3 or more tasks, Available if 0-2 tasks
    return taskCount >= 3 ? "Busy" : "Available";
  };

  // Build mechanics data with dynamic status
  const MECHANICS_DATA = BASE_MECHANICS_DATA.map((mechanic) => ({
    ...mechanic,
    status: getMechanicStatus(mechanic.id),
  }));

  const filteredMechanics = MECHANICS_DATA.filter((mechanic) => {
    if (
      searchQuery &&
      !mechanic.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const getStatusColor = (status) => {
    return status === "Available" ? "#34A853" : "#FF6B6B";
  };

  // Get task count for each mechanic
  const getTaskCount = (mechanicId) => {
    return tasks.filter((task) => task.assignedTo === mechanicId).length;
  };

  const renderMechanicItem = ({ item }) => {
    const taskCount = getTaskCount(item.id);

    return (
      <TouchableOpacity
        onPress={() => setSelectedMechanic(item)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 15,
          backgroundColor: "#fff",
          borderRadius: 10,
          marginBottom: 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 2,
        }}
      >
        {/* Avatar Placeholder */}
        <View
          style={{
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: COLORS.primaryLight,
            justifyContent: "center",
            alignItems: "center",
            marginRight: 15,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "bold" }}>
            {item.name.charAt(0)}
          </Text>
        </View>

        {/* Mechanic Info */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 4 }}>
            {item.name}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: getStatusColor(item.status),
                marginRight: 6,
              }}
            />
            <Text
              style={{
                color: getStatusColor(item.status),
                fontWeight: "500",
                marginRight: 12,
              }}
            >
              {item.status}
            </Text>
            <Text style={{ color: COLORS.grayDark, fontSize: 13 }}>
              {taskCount} task{taskCount !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        {/* Arrow Icon */}
        <Text style={{ fontSize: 20, color: COLORS.grayDark }}>›</Text>
      </TouchableOpacity>
    );
  };

  if (selectedMechanic) {
    return (
      <MechanicAssignment
        mechanic={selectedMechanic}
        tasks={tasks} // Pass tasks to MechanicAssignment
        onBack={() => setSelectedMechanic(null)}
      />
    );
  }

  // Otherwise show the list
  return (
    <View style={[styles.container, { paddingHorizontal: 15 }]}>
      {/* Header */}
      <View style={[styles.taskTableHeader, { marginBottom: 15 }]}>
        <Text style={{ color: "#fff", fontWeight: "500", fontSize: 16 }}>
          Mechanics ({filteredMechanics.length})
        </Text>
      </View>

      {/* Search Bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 15,
          gap: 10,
        }}
      >
        <TextInput
          placeholder="Search by mechanic"
          placeholderTextColor={COLORS.grayDark}
          style={[
            styles.searchInput,
            {
              flex: 1,
              backgroundColor: COLORS.grayLight,
              borderRadius: 8,
              paddingHorizontal: 12,
              height: 40,
            },
          ]}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Mechanics List */}
      <FlatList
        data={filteredMechanics}
        keyExtractor={(item) => item.id}
        renderItem={renderMechanicItem}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 50 }}>
            <Text style={{ color: COLORS.grayDark, fontSize: 16 }}>
              No mechanics found
            </Text>
          </View>
        }
      />
    </View>
  );
}
