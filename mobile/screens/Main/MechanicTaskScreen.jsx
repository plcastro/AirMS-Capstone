import React, { useState, useEffect, useContext } from "react";
import { View, TextInput, Dimensions, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import TaskTabs from "../../components/TaskAssignment/TaskTabs";
import TaskChecklist from "../../components/TaskAssignment/TaskChecklist";
import { Picker } from "@react-native-picker/picker";
import { styles } from "../../stylesheets/styles";
import TaskInfo from "../../components/TaskAssignment/TaskInfo";
import { API_BASE } from "../../utilities/API_BASE";
import { AuthContext } from "../../Context/AuthContext";
const { width } = Dimensions.get("window");

export default function EngineerTaskScreen() {
  const { user } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAircraft, setSelectedAircraft] = useState("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [aircraftOptions, setAircraftOptions] = useState([
    { id: "all", name: "All Aircraft" },
  ]);

  // Fetch tasks assigned to the current engineer
  useEffect(() => {
    const fetchTasks = async () => {
      console.log("User:", user);
      try {
        const token = await AsyncStorage.getItem("currentUserToken");
        const response = await fetch(`${API_BASE}/api/tasks/getAll`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        console.log("Response status:", response.status);
        if (response.ok) {
          const data = await response.json();
          console.log("Fetched tasks:", data.data);
          const assignedTasks = data.data.filter(
            (task) =>
              task.assignedToName === `${user?.firstName} ${user?.lastName}`,
          );
          console.log("Assigned tasks:", assignedTasks);
          setTasks(assignedTasks || []);
        } else {
          console.error("Failed to fetch tasks, status:", response.status);
          const errorText = await response.text();
          console.error("Error response:", errorText);
          setTasks(TaskInfo); // Fallback
        }
      } catch (error) {
        console.error("Error fetching tasks:", error);
        setTasks(TaskInfo); // Fallback
      }
    };
    if (user) {
      fetchTasks();
    }
  }, [user]);

  // Fetch aircraft options
  useEffect(() => {
    const fetchAircraft = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/aircraft/aircraft-tail-numbers`,
        );
        if (response.ok) {
          const data = await response.json();
          const options = [
            { id: "all", name: "All Aircraft" },
            ...data.map((aircraft) => ({
              id: aircraft.tailNum,
              name: aircraft.tailNum,
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
    if (
      searchQuery &&
      !task.title.toLowerCase().includes(searchQuery.toLowerCase())
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
    const formattedDate = now.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
    const formattedTime = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const updatedTask = {
      ...task,
      status: "Ongoing",
      startDateTime: `${formattedDate} ${formattedTime}`,
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
        const data = await response.json();
        const updatedTasks = tasks.map((t) =>
          t.id === task.id ? data.data : t,
        );
        setTasks(updatedTasks);
        setSelectedTask({
          ...data.data,
          findings: data.data.findings || "",
        });
      } else {
        Alert.alert("Error", "Failed to start task");
      }
    } catch (error) {
      console.error("Error starting task:", error);
      Alert.alert("Error", "Failed to start task");
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
        const data = await response.json();
        const updatedTasks = tasks.map((t) =>
          t.id === task.id ? data.data : t,
        );
        setTasks(updatedTasks);
        setSelectedTask((prev) => ({
          ...data.data,
        }));
      } else {
        Alert.alert("Error", "Failed to save draft");
      }
    } catch (error) {
      console.error("Error saving draft:", error);
      Alert.alert("Error", "Failed to save draft");
    }
  };

  const handleTurnIn = async (task, checklistState, findings, options = {}) => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
    const formattedTime = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const updatedTask = {
      ...task,
      checklistState: checklistState,
      findings: findings,
    };

    if (options.undo) {
      updatedTask.status = options.newStatus || "Ongoing";
      updatedTask.endDateTime = "";
    } else {
      updatedTask.status = "Turned in";
      updatedTask.endDateTime = `${formattedDate} ${formattedTime}`;
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
        const data = await response.json();
        const updatedTasks = tasks.map((t) =>
          t.id === task.id ? data.data : t,
        );
        setTasks(updatedTasks);
      } else {
        Alert.alert("Error", "Failed to turn in task");
      }
    } catch (error) {
      console.error("Error turning in task:", error);
      Alert.alert("Error", "Failed to turn in task");
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
        <View style={{ flex: 0.7 }}>
          <TextInput
            placeholder="Search tasks"
            placeholderTextColor="gray"
            style={[
              styles.searchInput,
              {
                height: 40,
                width: "100%",
                backgroundColor: "#fff",
                borderWidth: 1,
                borderColor: "#d4d4d4",
                borderRadius: 8,
                paddingHorizontal: 12,
              },
            ]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View
          style={{
            flex: 0.3,
            height: 40,
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: "#d4d4d4",
            borderRadius: 8,
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
                height: 40,
                width: "100%",
                color: "#333",
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

      <TaskTabs tasks={filteredTasks} onTaskPress={handleTaskPress} />

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
