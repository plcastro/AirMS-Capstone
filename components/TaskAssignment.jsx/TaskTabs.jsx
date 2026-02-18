import { View, ScrollView, Text } from "react-native";
import React, { useState } from "react";
import TaskCard from "../components/TaskAssignment/TaskCard";
import { styles } from "../stylesheets/styles";

export default function TaskTabs({ tasks }) {
  const [activeTab, setActiveTab] = useState("Current"); // "Current", "Upcoming", "Remarks"

  const filterTasks = () => {
    const now = new Date();

    switch (activeTab) {
      case "Current":
        // Tasks assigned to this mechanic and are ongoing
        return tasks.filter(
          (t) => t.assignedToMe && t.status === "Ongoing", // or "In Progress"
        );
      case "Upcoming":
        // Tasks assigned to this mechanic and scheduled in the future
        return tasks.filter(
          (t) =>
            t.assignedToMe &&
            t.status === "Pending" &&
            new Date(t.startDateTime) > now,
        );
      case "Remarks":
        // Completed tasks assigned to this mechanic (to add remarks or review)
        return tasks.filter((t) => t.assignedToMe && t.status === "Completed");
      default:
        return [];
    }
  };

  const tasksToRender = filterTasks();

  return (
    <View style={{ flex: 1 }}>
      {/* Tab Selector */}
      <View style={styles.tabHeader}>
        {["Current", "Upcoming", "Remarks"].map((tab) => (
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
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
