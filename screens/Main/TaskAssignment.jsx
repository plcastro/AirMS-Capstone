// TaskAssignment.jsx
import { View, TextInput, FlatList, Text, Dimensions } from "react-native";
import React, { useContext, useState } from "react";
import TaskCard from "../../components/TaskAssignment.jsx/TaskCard";
import { styles } from "../../stylesheets/styles";
import Button from "../../components/Button";
import { AuthContext } from "../../Context/AuthContext";
import { TaskInfo } from "../../components/TaskAssignment.jsx/TaskInfo";
import TaskChecklist from "../../components/TaskAssignment.jsx/TaskChecklist";
import AddTask from "../../components/TaskAssignment.jsx/AddTask";
import EditTask from "../../components/TaskAssignment.jsx/EditTask";

const { width } = Dimensions.get("window");

export default function TaskAssignment() {
  const { user } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState(
    user?.position === "head of maintenance" ? "Tasks" : "Current",
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Determine tabs based on position
  const tabs =
    user?.position === "head of maintenance"
      ? ["Tasks", "Submitted"]
      : ["Current", "Upcoming", "Remarks"];

  const taskHeaderMechanic =
    activeTab === "Current"
      ? "Assigned Tasks"
      : activeTab === "Upcoming"
        ? "Upcoming Tasks"
        : activeTab === "Remarks"
          ? "Remarks"
          : null;

  const taskHeaderHeadOfMaintenance =
    activeTab === "Tasks"
      ? "Task Orders"
      : activeTab === "Submitted"
        ? "Submitted Tasks"
        : null;

  // Open checklist modal for a task
  const handleStartTask = (task) => {
    setSelectedTask(task);
    setModalVisible(true);
  };

  // --- Filter tasks based on active tab and search ---
  const now = new Date();
  const filteredTasks = TaskInfo.filter((task) => {
    // Search filter
    if (
      searchQuery &&
      !task.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    // Tab filter
    switch (activeTab) {
      case "Current":
        return task.status === "Ongoing";
      case "Upcoming":
        return task.status === "Pending" && new Date(task.startDateTime) > now;
      case "Remarks":
        return task.status === "Completed";
      default:
        return true;
    }
  });

  return (
    <View style={styles.container}>
      {/* Search input */}
      <View style={[styles.searchRow, { maxWidth: 350 }]}>
        <TextInput
          placeholderTextColor={"gray"}
          placeholder="Search tasks"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.maintenanceSearchDivider} />

      {/* Tabs */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 5,
          marginBottom: 25,
        }}
      >
        {tabs.map((tab) => (
          <Button
            key={tab}
            label={tab}
            onPress={() => setActiveTab(tab)}
            buttonStyle={[
              activeTab === tab ? styles.primaryAlertBtn : styles.secondaryBtn,
              width < 425 ? { width: "30%" } : { width: 120 },
            ]}
            buttonTextStyle={[
              activeTab === tab ? styles.primaryBtnTxt : styles.secondaryBtnTxt,
              { fontSize: 14 },
            ]}
          />
        ))}

        {user?.position === "head of maintenance" && (
          <>
            <Button
              label="+ Add task"
              onPress={() => setAddModalVisible(true)}
              buttonStyle={[{ width: 120 }, styles.primaryAlertBtn]}
              buttonTextStyle={styles.primaryBtnTxt}
            />
            <View style={styles.taskTableHeader}>
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "500",
                  fontSize: 16,
                }}
              >
                {taskHeaderHeadOfMaintenance}
              </Text>
            </View>
            <View style={styles.taskTable}>
              <FlatList
                data={filteredTasks}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TaskCard
                    data={item}
                    onStartTask={() => handleStartTask(item)}
                    onEditTask={() => {
                      setSelectedTask(item);
                      setEditModalVisible(true);
                    }}
                    onDeleteTask={() => console.log("Delete", item.id)}
                  />
                )}
                ListEmptyComponent={
                  <Text style={{ textAlign: "center", marginTop: 20 }}>
                    No tasks in this tab
                  </Text>
                }
              />
            </View>
          </>
        )}
      </View>
      {user?.position === "mechanic" && (
        <>
          <View style={styles.taskTableHeader}>
            <Text
              style={{
                color: "#fff",
                fontWeight: "500",
                fontSize: 16,
              }}
            >
              {taskHeaderMechanic}
            </Text>
          </View>
          <View style={styles.taskTable}>
            <FlatList
              data={filteredTasks}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TaskCard
                  data={item}
                  onStartTask={() => handleStartTask(item)}
                />
              )}
              ListEmptyComponent={
                <Text style={{ textAlign: "center", marginTop: 20 }}>
                  No tasks in this tab
                </Text>
              }
            />
          </View>
        </>
      )}

      {/* Task Checklist Modal */}
      <TaskChecklist
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        task={selectedTask}
      />

      {/* Add Task Modal */}
      <AddTask
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onAddTask={(newTask) => {
          console.log("New Task:", newTask);
        }}
        employees={[
          { id: "1", name: "John Doe" },
          { id: "2", name: "Jane Smith" },
        ]}
        taskOptions={[
          { id: "1", name: "Engine Inspection" },
          { id: "2", name: "Landing Gear Check" },
        ]}
      />

      {/* Edit Task Modal */}
      <EditTask
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        task={selectedTask}
        onSave={(updatedTask) => {
          console.log("Updated Task:", updatedTask);
        }}
        employees={[
          { id: "1", name: "John Doe" },
          { id: "2", name: "Jane Smith" },
        ]}
        taskOptions={[
          { id: "1", name: "Engine Inspection" },
          { id: "2", name: "Landing Gear Check" },
        ]}
      />
    </View>
  );
}
