import { View, ScrollView, Text } from "react-native";
import React, { useState, useContext } from "react";
import TaskCard from "../components/TaskAssignment/TaskCard";
import { styles } from "../stylesheets/styles";
import { AuthContext } from "../Context/AuthContext";

export default function TaskTabs({ tasks }) {
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
          // All tasks (head can see everything)
          return tasks;
        case "Submitted":
          // Completed tasks (submitted by mechanics)
          return tasks.filter((t) => t.status === "Completed");
        default:
          return [];
      }
    } else {
      // Mechanic view
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
      </View>

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
                console.log(task.id);
                setSelectedTask(task);
                setShowEditModal(true);
              }}
              onDeleteTask={() => console.log("Delete task", task.id)}
            />
          ))
        )}
      </ScrollView>
      <AddTask
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddTask={(newTask) => {
          console.log("Add task:", newTask);
          setShowAddModal(false);
        }}
        employees={[]} // pass real employees here
        taskOptions={[]} // pass real task options here
      />
      <EditTask
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={(updatedTask) => {
          console.log("Updated task:", updatedTask);
          setShowEditModal(false);
        }}
        task={selectedTask}
        employees={[]}
        taskOptions={[]}
      />
    </View>
  );
}
