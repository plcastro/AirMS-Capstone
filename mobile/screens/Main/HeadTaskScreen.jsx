import React, { useContext, useState, useEffect } from "react";
import {
  View,
  TextInput,
  FlatList,
  Text,
  Dimensions,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import TaskCard from "../../components/TaskAssignment/TaskCard";
import TaskChecklist from "../../components/TaskAssignment/TaskChecklist";
import AddTask from "../../components/TaskAssignment/AddTask";
import EditTask from "../../components/TaskAssignment/EditTask";
import Button from "../../components/Button";
import { styles } from "../../stylesheets/styles";
import { API_BASE } from "../../utilities/API_BASE";
import { AuthContext } from "../../Context/AuthContext";
import { showToast } from "../../utilities/toast";
const { width } = Dimensions.get("window");

const isAssignableUser = (user) =>
  user?.jobTitle?.toLowerCase() === "mechanic";

export default function HeadTaskScreen({ targetTaskId, targetNotificationStatus }) {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Assigned");
  const [checklistVisible, setChecklistVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const tabs = ["Assigned", "To Be Reviewed", "Reviewed"];
  const [employees, setEmployees] = useState([]);

  // Fetch tasks on mount
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const token = await AsyncStorage.getItem("currentUserToken");
        const response = await fetch(`${API_BASE}/api/tasks/getAll`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setTasks(data.data || []);
        } else {
          console.error("Failed to fetch tasks");
          showToast("Failed to fetch tasks");
        }
      } catch (error) {
        console.error("Error fetching tasks:", error);
        showToast("Failed to fetch tasks");
      }
    };
    fetchTasks();
  }, []);

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
      setChecklistVisible(true);
      if (targetNotificationStatus === "Turned in") {
        setActiveTab("To Be Reviewed");
      }
    }
  }, [targetTaskId, targetNotificationStatus, tasks]);

  // Fetch assignable employees from the users collection
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const token = await AsyncStorage.getItem("currentUserToken");
        const response = await fetch(`${API_BASE}/api/user/get-all-users`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          const mechanics = (data.data || []).filter(
            (user) => isAssignableUser(user) && user.status === "active",
          );
          const mappedEmployees = mechanics.map((user) => ({
            id: user._id,
            name: `${user.firstName} ${user.lastName}`,
            jobTitle: user.jobTitle,
          }));
          setEmployees(mappedEmployees);
        } else {
          console.error("Failed to fetch employees");
          showToast("Failed to fetch employees");
        }
      } catch (error) {
        console.error("Error fetching employees:", error);
        showToast("Failed to fetch employees");
      }
    };
    fetchEmployees();
  }, []);

  const filteredTasks = tasks.filter((task) => {
    const taskTitle = task?.title || task?.maintenanceType || "";

    if (
      searchQuery &&
      !taskTitle.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;

    switch (activeTab) {
      case "Assigned":
        return (
          task.status === "Pending" ||
          task.status === "Ongoing" ||
          task.status === "Returned"
        );
      case "To Be Reviewed":
        return (
          task.status === "Turned in" ||
          (task.status === "Completed" && !task.isApproved)
        );
      case "Reviewed":
        return task.isApproved === true || task.status === "Approved";
      default:
        return false;
    }
  });

  const taskHeader =
    activeTab === "Assigned"
      ? "Assigned Tasks"
      : activeTab === "To Be Reviewed"
        ? "To Be Reviewed"
        : "Reviewed Tasks";

  const formatDisplayDate = (dateString) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const handleTaskPress = (task) => {
    setSelectedTask(task);
    setChecklistVisible(true);
  };

  const handleAddTask = async (newTask) => {
    console.log("Adding task:", newTask);
    try {
      const token = await AsyncStorage.getItem("currentUserToken");
      const response = await fetch(`${API_BASE}/api/tasks/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newTask),
      });
      if (response.ok) {
        const data = await response.json();
        console.log("Task added:", data.data);
        setTasks([...tasks, data.data]);
        setAddModalVisible(false);
      } else {
        const errorData = await response.json();
        console.error("Failed to add task:", errorData);
        showToast("Failed to add task");
      }
    } catch (error) {
      console.error("Error adding task:", error);
      showToast("Failed to add task");
    }
  };

  const handleEditTask = async (updatedTask) => {
    try {
      const token = await AsyncStorage.getItem("currentUserToken");
      const response = await fetch(`${API_BASE}/api/tasks/${updatedTask.id}`, {
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
          t.id === updatedTask.id ? data.data : t,
        );
        setTasks(updatedTasks);
        setEditModalVisible(false);
      } else {
        showToast("Failed to update task");
      }
    } catch (error) {
      console.error("Error updating task:", error);
      showToast("Failed to update task");
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      const token = await AsyncStorage.getItem("currentUserToken");
      const response = await fetch(`${API_BASE}/api/tasks/${taskId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const updatedTasks = tasks.filter((t) => t.id !== taskId);
        setTasks(updatedTasks);
      } else {
        showToast("Failed to delete task");
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      showToast("Failed to delete task");
    }
  };

  const handleApproveTask = async (task, approveData) => {
    const now = new Date().toISOString();
    const approverName =
      `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
      user?.username ||
      "Maintenance Manager";

    const updatedTask = {
      ...task,
      status: "Approved",
      isApproved: true,
      approvedBy: approverName,
      approvedSignature: approveData?.signature || "",
      reviewedAt: now,
      approvedAt: now,
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
      } else {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Failed to approve task");
      }
    } catch (error) {
      console.error("Error approving task:", error);
      throw error;
    }
  };

  const handleReturnTask = async (task, returnData) => {
    const now = new Date().toISOString();

    const updatedTask = {
      ...task,
      status: "Returned",
      returnComments: returnData?.comments || "Please revise findings",
      returnedBy: returnData?.signature || "Head Mechanic",
      reviewedAt: now,
      returnedAt: now,
      isApproved: false,
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
      } else {
        showToast("Failed to return task");
      }
    } catch (error) {
      console.error("Error returning task:", error);
      showToast("Failed to return task");
    }
  };

  const renderTask = ({ item }) => {
    const showEditDelete = activeTab === "Assigned" && item.status === "Pending";

    return (
      <View>
        {/* Date Header */}
        <View
          style={{
            marginTop: 10,
            borderTopLeftRadius: 4,
            borderTopRightRadius: 4,
          }}
        >
          <Text style={{ fontWeight: "600", fontSize: 16 }}>
            {formatDisplayDate(item.endDateTime || item.dueDate)}
          </Text>
        </View>

        {/* Task Card */}
        <TaskCard
          data={item}
          isHeadView={true}
          showEditDelete={showEditDelete}
          onPress={() => handleTaskPress(item)}
          onEditTask={() => {
            setSelectedTask(item);
            setEditModalVisible(true);
          }}
          onDeleteTask={() => handleDeleteTask(item.id)}
          onApprove={() => handleApproveTask(item)}
          onReturn={() => {
            setSelectedTask(item);
            setChecklistVisible(true);
          }}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={[styles.searchRow, { maxWidth: 550, marginBottom: 10 }]}>
        <TextInput
          placeholder="Search tasks"
          placeholderTextColor="gray"
          style={[styles.searchInput, { flex: 1, backgroundColor: "#ffffff" }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      <View style={styles.maintenanceSearchDivider} />

      {/* Tabs and Add Task Button */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 10,
          gap: 5,
        }}
      >
        {tabs.map((tab) => (
          <Button
            key={tab}
            label={tab}
            onPress={() => setActiveTab(tab)}
            buttonStyle={[
              activeTab === tab ? styles.primaryAlertBtn : styles.secondaryBtn,
              width < 425 ? { width: "30%" } : { width: 150 },
            ]}
            buttonTextStyle={[
              activeTab === tab ? styles.primaryBtnTxt : styles.secondaryBtnTxt,
              { fontSize: 14 },
            ]}
          />
        ))}

        <Button
          label="+ Add Task"
          onPress={() => setAddModalVisible(true)}
          buttonStyle={[styles.primaryAlertBtn, { width: 120 }]}
          buttonTextStyle={styles.primaryBtnTxt}
        />
      </View>

      {/* Header */}
      <View style={styles.taskTableHeader}>
        <Text style={{ color: "#fff", fontWeight: "500", fontSize: 16 }}>
          {taskHeader}
        </Text>
      </View>

      {/* Task List */}
      <View style={styles.taskTable}>
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id || item._id}
          renderItem={renderTask}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 20 }}>
              {activeTab === "Assigned"
                ? "No tasks assigned in this tab"
                : activeTab === "To Be Reviewed"
                  ? "No tasks to be reviewed in this tab"
                  : "No tasks reviewed in this tab"}
            </Text>
          }
        />
      </View>

      {/* Modals */}
      <TaskChecklist
        visible={checklistVisible}
        onClose={() => setChecklistVisible(false)}
        task={selectedTask}
        isHeadView={true}
        onApprove={handleApproveTask}
        onReturn={handleReturnTask}
      />

      <AddTask
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onAddTask={handleAddTask}
        employees={employees}
      />

      <EditTask
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        task={selectedTask}
        onSave={handleEditTask}
        employees={employees}
      />
    </View>
  );
}
