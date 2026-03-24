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

// Base engineer data without status (will be calculated)
const BASE_ENGINEER_DATA = [
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
  const [selectedEngineer, setSelectedEngineer] = useState(null);

  // Use tasks from TaskInfo - declared ONCE
  const tasks = TaskInfo;

  // Calculate engineer status based on task count - declared ONCE
  const getEngineerStatus = (engineerId) => {
    const taskCount = tasks.filter(
      (task) => task.assignedTo === engineerId,
    ).length;
    // Busy if 3 or more tasks, Available if 0-2 tasks
    return taskCount >= 3 ? "Busy" : "Available";
  };

  // Build engineers data with dynamic status - declared ONCE
  const ENGINEER_DATA = BASE_ENGINEER_DATA.map((engineer) => ({
    ...engineer,
    status: getEngineerStatus(engineer.id),
  }));

  const filteredEngineers = ENGINEER_DATA.filter((engineer) => {
    if (
      searchQuery &&
      !engineer.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const getStatusColor = (status) => {
    return status === "Available" ? "#34A853" : "#FF6B6B";
  };

  // Get task count for each engineer
  const getTaskCount = (engineerId) => {
    return tasks.filter((task) => task.assignedTo === engineerId).length;
  };

  const renderEngineerItem = ({ item }) => {
    const taskCount = getTaskCount(item.id);
    return (
      <TouchableOpacity
        onPress={() => setSelectedEngineer(item)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 15,
          backgroundColor: "#fff",
          borderRadius: 7,
          marginBottom: 10,
          marginHorizontal: 7,
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

        {/* Engineer Info */}
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

  if (selectedEngineer) {
    return (
      <MechanicAssignment
        engineer={selectedEngineer}
        tasks={tasks} // Pass tasks to EngineerAssignment
        onBack={() => setSelectedEngineer(null)}
      />
    );
  }

  // Otherwise show the list
  return (
    <FlatList
      data={filteredEngineers}
      keyExtractor={(item) => item.id}
      renderItem={renderEngineerItem}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={{ paddingHorizontal: 7, paddingTop: 10 }}>
          <View style={[styles.taskTableHeader, { marginBottom: 15 }]}>
            <Text style={{ color: "#fff", fontWeight: "500", fontSize: 16 }}>
              Total Engineers ({filteredEngineers.length})
            </Text>
          </View>

          {/* Search Bar */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 15,
            }}
          >
            <TextInput
              placeholder="Search by engineer"
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
        </View>
      }
      ListEmptyComponent={
        <View style={{ alignItems: "center", marginTop: 50 }}>
          <Text style={{ color: COLORS.grayDark, fontSize: 16 }}>
            No engineers found
          </Text>
        </View>
      }
      // Ensures the last item isn't cut off by the bottom of the screen
      contentContainerStyle={{ paddingBottom: 20 }}
    />
  );
}
