import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MechanicAssignment from "./MechanicAssignment";
import TaskInfo from "../../components/TaskAssignment/TaskInfo";
import { styles } from "../../stylesheets/styles";
import { COLORS } from "../../stylesheets/colors";
import { API_BASE } from "../../utilities/API_BASE";

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
// Mock data for mechanics (fallback)
const MECHANICS_DATA = [
  { id: "1", name: "John Doe", status: "Available", avatar: null },
  { id: "2", name: "Clara Bang", status: "Available", avatar: null },
  { id: "3", name: "Joe Bloggs", status: "Available", avatar: null },
  { id: "4", name: "Max Miller", status: "Available", avatar: null },
  { id: "5", name: "Liam Brown", status: "Busy", avatar: null },
  { id: "6", name: "Dilan Wolf", status: "Busy", avatar: null },
  { id: "7", name: "Bob Rosfield", status: "Busy", avatar: null },
];

export default function MechanicList() {
  const [mechanics, setMechanics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMechanic, setSelectedMechanic] = useState(null);

  useEffect(() => {
    const fetchMechanics = async () => {
      try {
        const token = await AsyncStorage.getItem("currentUserToken");
        const response = await fetch(`${API_BASE}/api/user/getAllUsers`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          const mechanicsData = data.data.filter(user => user.jobTitle === "Mechanic" && user.status === "active");
          const mappedMechanics = mechanicsData.map((user) => ({
            id: user._id,
            name: `${user.firstName} ${user.lastName}`,
            status: "Available", // Default status, can be updated based on tasks
            avatar: user.image || null,
          }));
          setMechanics(mappedMechanics);
        } else {
          console.error("Failed to fetch users");
          setMechanics(MECHANICS_DATA); // Fallback to mock data
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        setMechanics(MECHANICS_DATA); // Fallback to mock data
      } finally {
        setLoading(false);
      }
    };
    fetchMechanics();
  }, []);

  const filteredMechanics = mechanics.filter((mechanic) => {
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
    return tasks.filter(task => task.assignedTo === mechanicId).length;
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
            <View style={{ 
              width: 8, 
              height: 8, 
              borderRadius: 4, 
              backgroundColor: getStatusColor(item.status),
              marginRight: 6 
            }} />
            <Text style={{ color: getStatusColor(item.status), fontWeight: "500", marginRight: 12 }}>
              {item.status}
            </Text>
            <Text style={{ color: COLORS.grayDark, fontSize: 13 }}>
              {taskCount} task{taskCount !== 1 ? 's' : ''}
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
              {loading ? "Loading mechanics..." : "No mechanics found"}
            </Text>
          </View>
        }
      />
    </View>
  );
}