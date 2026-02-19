import { View, ScrollView, Text } from "react-native";
import React, { useState, useContext } from "react";
import TaskCard from "../components/TaskAssignment/TaskCard";
import { styles } from "../stylesheets/styles";
import { AuthContext } from "../Context/AuthContext";
import AddTask from "../components/TaskAssignment/AddTask";
import EditTask from "../components/TaskAssignment/EditTask";

export default function TaskTabs({ tasks, employees, taskOptions }) {
  const { user } = useContext(AuthContext);
  const isHead = user?.position === "head of maintenance";

  const mechanicTabs = ["Current", "Upcoming", "Remarks"];
  const headTabs = ["Tasks", "Submitted"];
  const [activeTab, setActiveTab] = useState(isHead ? "Tasks" : "Current");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const filterTasks = () => {
    const now = new Date();

    if (isHead) {
      switch (activeTab) {
        case "Tasks":
          return tasks; // Head sees all tasks
        case "Submitted":
          return tasks.filter((t) => t.status === "Completed");
        default:
          return [];
      }
    } else {
      switch (activeTab) {
        case "Current":
          return tasks.filter((t) => t.assignedToMe && t.status === "Ongoing");
        case "Upcoming":
          return tasks.filter(
            (t) =>
              t.assignedToMe &&
              t.status === "Pending" &&
              new Date(t.startDateTime) > now,
          );
        case "Remarks":
          return tasks.filter(
            (t) => t.assignedToMe && t.status === "Completed",
          );
        default:
          return [];
      }
    }
  };

  const tasksToRender = filterTasks();
  const tabsToRender = isHead ? headTabs : mechanicTabs;

  return (
    <View style={{ flex: 1 }}>
      {/* Tab Selector */}
      <View style={styles.tabHeader}>
        {tabsToRender.map((tab) => (
          <Text
            key={tab}
            style={[styles.tabText, activeTab === tab && styles.activeTabText]}
            onPress={() => setActiveTab(tab)}
          >
            {tab}
          </Text>
        ))}

        {/* Head: Add Task button */}
        {isHead && (
          <Text
            style={[styles.tabText, { marginLeft: 15, color: "#fff" }]}
            onPress={() => setShowAddModal(true)}
          >
            + Add Task
          </Text>
        )}
      </View>

      {/* Task List */}
      <ScrollView contentContainerStyle={{ padding: 10 }}>
        {tasksToRender.length === 0 ? (
          <Text style={{ textAlign: "center", marginTop: 20 }}>
            No tasks available
          </Text>
        ) : (
          tasksToRender.map((task) => (
            <TaskCard
              key={task.id}
              data={task}
              onStartTask={() => console.log("Start task", task.id)}
              onEditTask={() => {
                setSelectedTask(task);
                setShowEditModal(true);
              }}
              onDeleteTask={() => console.log("Delete task", task.id)}
            />
          ))
        )}
      </ScrollView>

      {/* Add Task Modal */}
      <AddTask
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddTask={(newTask) => {
          console.log("Added Task:", newTask);
          setShowAddModal(false);
        }}
        employees={employees}
        taskOptions={taskOptions}
      />

      {/* Edit Task Modal */}
      <EditTask
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={(updatedTask) => {
          console.log("Updated Task:", updatedTask);
          setShowEditModal(false);
        }}
        task={selectedTask}
        employees={employees}
        taskOptions={taskOptions}
      />
    </View>
  );
}
