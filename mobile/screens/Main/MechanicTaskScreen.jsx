import React, { useState, useEffect, useContext } from "react";
import { View, TextInput } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import TaskTabs from "../../components/TaskAssignment/TaskTabs";
import TaskChecklist from "../../components/TaskAssignment/TaskChecklist";
import { Picker } from "@react-native-picker/picker";
import { styles } from "../../stylesheets/styles";
import { API_BASE } from "../../utilities/API_BASE";
import { AuthContext } from "../../Context/AuthContext";
import { showToast } from "../../utilities/toast";
export default function MechanicTaskScreen({ targetTaskId, targetNotificationStatus }) {
  const { user } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAircraft, setSelectedAircraft] = useState("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [aircraftOptions, setAircraftOptions] = useState([
    { id: "all", name: "All Aircraft" },
  ]);
  const currentUserId = user?.id || user?._id || "";

  const parseJsonSafely = async (response) => {
    const text = await response.text();

    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      console.error("Failed to parse JSON response:", text);
      throw new Error("Server returned an invalid response");
    }
  };

  const isSameTask = (left, right) =>
    String(left?.id || left?._id || "") === String(right?.id || right?._id || "");

  const fetchTasks = async ({ silent = false } = {}) => {
    if (!currentUserId) return;

    try {
      if (!silent) setRefreshing(true);
      const token = await AsyncStorage.getItem("currentUserToken");
      const response = await fetch(`${API_BASE}/api/tasks/getAll`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await parseJsonSafely(response);
        const assignedTasks = (data?.data || []).filter(
          (task) => String(task.assignedTo) === String(currentUserId),
        );
        setTasks(assignedTasks || []);
      } else {
        console.error("Failed to fetch tasks, status:", response.status);
        const errorText = await response.text();
        console.error("Error response:", errorText);
        setTasks([]);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setTasks([]);
    } finally {
      if (!silent) setRefreshing(false);
    }
  };

  // Fetch tasks assigned to the current mechanic
  useEffect(() => {
    if (currentUserId) {
      fetchTasks();
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!targetTaskId || tasks.length === 0) {
      return;
    }

    const match = tasks.find(
      (task) =>
        String(task._id) === String(targetTaskId) ||
        String(task.id) === String(targetTaskId),
    );

    if (match) {
      setSelectedTask(match);
      setModalVisible(true);
      if (targetNotificationStatus === "Turned in") {
        setSelectedAircraft(match.aircraft || "all");
      }
    }
  }, [targetTaskId, targetNotificationStatus, tasks]);

  // Fetch aircraft options
  useEffect(() => {
    const fetchAircraft = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/parts-monitoring/aircraft-list`,
        );
        if (response.ok) {
          const data = await response.json();
          const options = [
            { id: "all", name: "All Aircraft" },
            ...(data.data || []).map((aircraft) => ({
              id: aircraft,
              name: aircraft,
            })),
          ];
          setAircraftOptions(options);
        } else {
          console.error("Failed to fetch aircraft");
        }
      } catch (error) {
        console.error("Error fetching aircraft:", error);
      }
    };
    fetchAircraft();
  }, []);

  const filteredTasks = tasks.filter((task) => {
    const taskTitle = task?.title || task?.maintenanceType || "";

    if (
      searchQuery &&
      !taskTitle.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;

    if (selectedAircraft !== "all") {
      if (task.aircraft !== selectedAircraft) {
        return false;
      }
    }

    return true;
  });

  const handleTaskPress = (task) => {
    setSelectedTask(task);
    setModalVisible(true);
  };

  const handleStartTask = async (task) => {
    const now = new Date();

    const updatedTask = {
      ...task,
      status: "Ongoing",
      startDateTime: now.toISOString(),
    };

    try {
      const token = await AsyncStorage.getItem("currentUserToken");
      const response = await fetch(`${API_BASE}/api/tasks/${task.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedTask),
      });
      if (response.ok) {
        const data = await parseJsonSafely(response);
        const savedTask = data?.data || updatedTask;
        const updatedTasks = tasks.map((t) =>
          isSameTask(t, task) ? savedTask : t,
        );
        setTasks(updatedTasks);
        setSelectedTask({
          ...savedTask,
          findings: savedTask.findings || "",
        });
        await fetchTasks({ silent: true });
      } else {
        showToast("Failed to start task");
      }
    } catch (error) {
      console.error("Error starting task:", error);
      showToast("Failed to start task");
    }
  };

  const handleSaveDraft = async (task, checklistState, findings) => {
    const updatedTask = {
      ...task,
      checklistState: checklistState,
      findings: findings,
    };

    try {
      const token = await AsyncStorage.getItem("currentUserToken");
      const response = await fetch(`${API_BASE}/api/tasks/${task.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedTask),
      });
      if (response.ok) {
        const data = await parseJsonSafely(response);
        const savedTask = data?.data || updatedTask;
        const updatedTasks = tasks.map((t) =>
          isSameTask(t, task) ? savedTask : t,
        );
        setTasks(updatedTasks);
        setSelectedTask((prev) => ({
          ...(prev || {}),
          ...savedTask,
        }));
        await fetchTasks({ silent: true });
      } else {
        showToast("Failed to save draft");
      }
    } catch (error) {
      console.error("Error saving draft:", error);
      showToast("Failed to save draft");
    }
  };

  const handleTurnIn = async (task, checklistState, findings, options = {}) => {
    const now = new Date().toISOString();

    const updatedTask = {
      ...task,
      checklistState: checklistState,
      findings: findings,
    };

    if (options.undo) {
      updatedTask.status = options.newStatus || "Ongoing";
      updatedTask.completedAt = null;
    } else {
      updatedTask.status = "Turned in";
      updatedTask.completedAt = now;
    }

    try {
      const token = await AsyncStorage.getItem("currentUserToken");
      const response = await fetch(`${API_BASE}/api/tasks/${task.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedTask),
      });
      if (response.ok) {
        const data = await parseJsonSafely(response);
        const savedTask = data?.data || updatedTask;
        const updatedTasks = tasks.map((t) =>
          isSameTask(t, task) ? savedTask : t,
        );
        setTasks(updatedTasks);
        setSelectedTask(savedTask);
        await fetchTasks({ silent: true });
      } else {
        showToast("Failed to turn in task");
      }
    } catch (error) {
      console.error("Error turning in task:", error);
      showToast("Failed to turn in task");
    }
  };

  return (
    <View style={styles.container}>
      {/* Search and Filter Row */}
      <View
        style={[
          styles.searchRow,
          {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            maxWidth: 550,
            marginBottom: 10,
            width: "100%",
          },
        ]}
      >
        <View style={[styles.unifiedSearchBox, { flex: 0.58 }]}>
          <TextInput
            placeholder="Search tasks"
            placeholderTextColor="#666"
            style={styles.unifiedSearchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View
          style={{
            flex: 0.42,
            minHeight: 48,
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: "#d1d5db",
            borderRadius: 10,
            overflow: "hidden",
            justifyContent: "center",
          }}
        >
          <Picker
            selectedValue={selectedAircraft}
            onValueChange={(itemValue) => setSelectedAircraft(itemValue)}
            style={[
              styles.filterPicker,
              {
                height: 50,
                width: "100%",
                color: "#333",
                fontSize: 12,
                marginTop: -4,
              },
            ]}
            dropdownIconColor="#666"
            mode="dropdown"
          >
            {aircraftOptions.map((aircraft) => (
              <Picker.Item
                key={aircraft.id}
                label={aircraft.name}
                value={aircraft.id}
              />
            ))}
          </Picker>
        </View>
      </View>
      <View style={styles.maintenanceSearchDivider} />

      <TaskTabs
        tasks={filteredTasks}
        onTaskPress={handleTaskPress}
        onRefresh={fetchTasks}
        refreshing={refreshing}
      />

      <TaskChecklist
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        task={selectedTask}
        onStartTask={handleStartTask}
        onSaveDraft={handleSaveDraft}
        onTurnIn={handleTurnIn}
      />
    </View>
  );
}
