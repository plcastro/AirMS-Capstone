import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MechanicAssignment from "./MechanicAssignment";
import { styles } from "../../stylesheets/styles";
import { COLORS } from "../../stylesheets/colors";
import { API_BASE } from "../../utilities/API_BASE";

const isAssignableUser = (user) =>
  ["engineer", "mechanic"].includes(user?.jobTitle?.toLowerCase());
const getEngineerStatus = (taskCount) => (taskCount >= 3 ? "Busy" : "Available");

export default function MechanicList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEngineer, setSelectedEngineer] = useState(null);
  const [engineers, setEngineers] = useState([]);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await AsyncStorage.getItem("currentUserToken");

        const [usersResponse, tasksResponse] = await Promise.all([
          fetch(`${API_BASE}/api/user/getAllUsers`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API_BASE}/api/tasks/getAll`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (!usersResponse.ok) {
          throw new Error("Failed to fetch assignable users");
        }

        if (!tasksResponse.ok) {
          throw new Error("Failed to fetch tasks");
        }

        const usersData = await usersResponse.json();
        const tasksData = await tasksResponse.json();

        setTasks(tasksData.data || []);
        setEngineers(
          (usersData.data || [])
            .filter((user) => isAssignableUser(user) && user.status === "active")
            .map((user) => ({
              id: user._id,
              name: `${user.firstName} ${user.lastName}`,
              avatar: user.image || null,
              jobTitle: user.jobTitle,
            })),
        );
      } catch (error) {
        console.error("Error fetching assignable user list:", error);
        Alert.alert("Error", error.message || "Failed to fetch employees");
      }
    };

    fetchData();
  }, []);

  const getTaskCount = (engineerId) => {
    return tasks.filter((task) => String(task.assignedTo) === String(engineerId))
      .length;
  };

  const filteredEngineers = engineers
    .map((engineer) => {
      const taskCount = getTaskCount(engineer.id);

      return {
        ...engineer,
        status: getEngineerStatus(taskCount),
        taskCount,
      };
    })
    .filter((engineer) => {
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

  const renderEngineerItem = ({ item }) => {
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
              {item.taskCount} task{item.taskCount !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        {/* Arrow Icon */}
        <Text style={{ fontSize: 20, color: COLORS.grayDark }}>></Text>
      </TouchableOpacity>
    );
  };

  if (selectedEngineer) {
    return (
      <MechanicAssignment
        engineer={selectedEngineer}
        tasks={tasks}
        onBack={() => setSelectedEngineer(null)}
      />
    );
  }
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
      contentContainerStyle={{ paddingBottom: 20 }}
    />
  );
}

