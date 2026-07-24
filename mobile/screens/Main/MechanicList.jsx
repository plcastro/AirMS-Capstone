import React, { useCallback, useEffect, useState } from "react";
import AppText from "../../components/common/AppText";
import AppInput from "../../components/common/AppInput";
import {
  View,
  FlatList,
  TouchableOpacity
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import MechanicAssignment from "./MechanicAssignment";
import { styles } from "../../stylesheets/styles";
import { COLORS } from "../../stylesheets/colors";
import { API_BASE } from "../../utilities/API_BASE";
import { showToast } from "../../utilities/toast";

const isAssignableUser = (user) => user?.jobTitle?.toLowerCase() === "mechanic";
const getMechanicStatus = (taskCount) =>
  taskCount >= 3 ? "Busy" : "Available";
const getDisplayStatus = (isOnline, workloadStatus) => {
  if (!isOnline) return "Offline";
  return workloadStatus === "Busy" ? "Busy" : "Available";
};
const getDisplayStatusColor = (status) => {
  switch (status) {
    case "Busy":
      return "#ef4444";
    case "Available":
      return "#22c55e";
    default:
      return "#9ca3af";
  }
};
const isActiveTask = (task) =>
  !["completed", "turned in", "approved"].includes(
    task?.status?.toLowerCase?.() || "",
  );

export default function MechanicList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMechanic, setSelectedMechanic] = useState(null);
  const [mechanics, setMechanics] = useState([]);
  const [tasks, setTasks] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("currentUserToken");

      const [usersResponse, tasksResponse] = await Promise.all([
        fetch(`${API_BASE}/api/user/assignable-users`, {
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
      setMechanics(
        (usersData.data || [])
          .filter((user) => isAssignableUser(user) && user.status === "active")
          .map((user) => {
            const isOnline = Boolean(user?.isOnline ?? user?.online);

            return {
              id: user._id,
              name: `${user.firstName} ${user.lastName}`,
              avatar: user.image || null,
              jobTitle: user.jobTitle,
              isOnline,
              online: isOnline,
              platform: isOnline ? user?.platform || "unknown" : "",
            };
          }),
      );
    } catch (error) {
      console.error("Error fetching assignable user list:", error);
      showToast(error.message || "Failed to fetch employees");
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const getTaskCount = (mechanicId) => {
    return tasks.filter(
      (task) =>
        String(task.assignedTo) === String(mechanicId) && isActiveTask(task),
    ).length;
  };

  const filteredMechanics = mechanics
    .map((mechanic) => {
      const taskCount = getTaskCount(mechanic.id);

      return {
        ...mechanic,
        status: getMechanicStatus(taskCount),
        taskCount,
      };
    })
    .filter((mechanic) => {
      if (
        searchQuery &&
        !mechanic.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });

  const renderMechanicItem = ({ item }) => {
    const displayStatus = getDisplayStatus(item.isOnline, item.status);
    const statusColor = getDisplayStatusColor(displayStatus);

    return (
      <TouchableOpacity
        onPress={() => setSelectedMechanic(item)}
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
          <AppText style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
            {item.name.charAt(0)}
          </AppText>
        </View>

        {/* Mechanic Info */}
        <View style={{ flex: 1 }}>
          <AppText style={{ fontSize: 14, fontWeight: "600", marginBottom: 4 }}>
            {item.name}
          </AppText>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: statusColor,
                marginRight: 6,
              }}
            />
            <AppText
              style={{
                color: statusColor,
                fontWeight: "500",
                marginRight: 12,
              }}
            >
              {displayStatus}
            </AppText>

            <AppText style={{ color: COLORS.grayDark, fontSize: 12 }}>
              {item.taskCount} task{item.taskCount !== 1 ? "s" : ""}
            </AppText>
          </View>
        </View>

        {/* Arrow Icon */}
        <AppText style={{ fontSize: 12, color: COLORS.grayDark }}></AppText>
      </TouchableOpacity>
    );
  };

  if (selectedMechanic) {
    return (
      <MechanicAssignment
        mechanic={selectedMechanic}
        tasks={tasks}
        onBack={() => setSelectedMechanic(null)}
      />
    );
  }

  return (
    <FlatList
      data={filteredMechanics}
      keyExtractor={(item) => item.id}
      renderItem={renderMechanicItem}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={{ paddingHorizontal: 7, paddingTop: 10 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 15,
            }}
          >
            <AppInput
              placeholder="Search by mechanic"
              placeholderTextColor={COLORS.grayDark}
              style={[
                styles.searchInput,
                {
                  flex: 1,
                  backgroundColor: COLORS.white,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  height: 48,
                },
              ]}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <View style={{ marginBottom: 15 }}>
            <AppText
              style={{
                color: "#5a5a5a",
                fontWeight: "500",
                textAlign: "right",
                fontSize: 12,
              }}
            >
              Total Mechanics ({filteredMechanics.length})
            </AppText>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={{ alignItems: "center", marginTop: 50 }}>
          <AppText style={{ color: COLORS.grayDark, fontSize: 12 }}>
            No mechanics found
          </AppText>
        </View>
      }
      contentContainerStyle={{ paddingBottom: 110 }}
    />
  );
}
