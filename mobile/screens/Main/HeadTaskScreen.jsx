import React, { useState } from "react";
import { View, TextInput, FlatList, Text, Dimensions } from "react-native";
import TaskCard from "../../components/TaskAssignment/TaskCard";
import TaskChecklist from "../../components/TaskAssignment/TaskChecklist";
import AddTask from "../../components/TaskAssignment/AddTask";
import EditTask from "../../components/TaskAssignment/EditTask";
import Button from "../../components/Button";
import { styles } from "../../stylesheets/styles";
import TaskInfo from "../../components/TaskAssignment/TaskInfo";

const { width } = Dimensions.get("window");

export default function HeadTaskScreen({ employees = [], taskOptions = [] }) {
  const tasks = TaskInfo;
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Tasks");
  const [modalVisible, setModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const tabs = ["Tasks", "Submitted"];

  // Filter tasks by search and tab
  const filteredTasks = tasks.filter((task) => {
    if (
      searchQuery &&
      !task.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    if (activeTab === "Tasks") return true;
    if (activeTab === "Submitted") return task.status === "Completed";
    return false;
  });

  const taskHeader = activeTab === "Tasks" ? "Task Orders" : "Submitted Tasks";

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

        {/* Add Task */}
        <Button
          label="+ Add task"
          onPress={() => setAddModalVisible(true)}
          buttonStyle={[
            styles.primaryAlertBtn,
            width < 425 ? { width: "30%" } : { width: 120 },
          ]}
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

      {/* Modals */}
      <TaskChecklist
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        task={selectedTask}
      />
      <AddTask
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onAddTask={(newTask) => console.log("New Task:", newTask)}
        employees={employees}
        taskOptions={taskOptions}
      />
      <EditTask
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        task={selectedTask}
        onSave={(updatedTask) => console.log("Updated Task:", updatedTask)}
        employees={employees}
        taskOptions={taskOptions}
      />
    </View>
  );
}
