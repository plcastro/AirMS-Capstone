import React, { useState } from "react";
import { View, TextInput, FlatList, Text, Dimensions } from "react-native";
import TaskCard from "../../components/TaskAssignment/TaskCard.jsx";
import TaskChecklist from "../../components/TaskAssignment/TaskChecklist.jsx";
import Button from "../../components/Button";
import { styles } from "../../stylesheets/styles";
import TaskInfo from "../../components/TaskAssignment/TaskInfo.jsx";

const { width } = Dimensions.get("window");

export default function MechanicTaskScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Current");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const tasks = TaskInfo;
  const tabs = ["Current", "Upcoming", "Remarks"];
  const now = new Date();

  // Filter tasks by search and tab (show all tasks)
  const filteredTasks = tasks.filter((task) => {
    if (
      searchQuery &&
      !task.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;

    switch (activeTab) {
      case "Current":
        return task.status === "Ongoing";
      case "Upcoming":
        return task.status === "Pending";
      case "Remarks":
        return task.status === "Completed";
      default:
        return false;
    }
  });

  const taskHeader =
    activeTab === "Current"
      ? "Assigned Tasks"
      : activeTab === "Upcoming"
        ? "Upcoming Tasks"
        : "Remarks";

  const handleStartTask = (task) => {
    setSelectedTask(task);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={[styles.searchRow, { maxWidth: 350 }]}>
        <TextInput
          placeholder="Search tasks"
          placeholderTextColor="gray"
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
          marginBottom: 25,
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
              width < 425 ? { width: "30%" } : { width: 120 },
            ]}
            buttonTextStyle={[
              activeTab === tab ? styles.primaryBtnTxt : styles.secondaryBtnTxt,
              { fontSize: 14 },
            ]}
          />
        ))}
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
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TaskCard data={item} onStartTask={() => handleStartTask(item)} />
          )}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 20 }}>
              No tasks in this tab
            </Text>
          }
        />
      </View>

      {/* Task Checklist Modal */}
      <TaskChecklist
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        task={selectedTask}
      />
    </View>
  );
}
