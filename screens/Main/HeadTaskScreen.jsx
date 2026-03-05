import React, { useState } from "react";
import { View, TextInput, FlatList, Text, Dimensions } from "react-native";
import TaskCard from "../../components/TaskAssignment.jsx/TaskCard";
import TaskChecklist from "../../components/TaskAssignment.jsx/TaskChecklist";
import AddTask from "../../components/TaskAssignment.jsx/AddTask";
import EditTask from "../../components/TaskAssignment.jsx/EditTask";
import Button from "../../components/Button";
import { styles } from "../../stylesheets/styles";
import TaskInfo from "../../components/TaskAssignment.jsx/TaskInfo.jsx";
const { width } = Dimensions.get("window");

export default function HeadTaskScreen({ employees = [], taskOptions = [] }) {
  const [tasks, setTasks] = useState(TaskInfo);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Assigned");
  const [checklistVisible, setChecklistVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const tabs = ["Assigned", "To Be Reviewed", "Reviewed"];

  const filteredTasks = tasks.filter((task) => {
    if (
      searchQuery &&
      !task.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;

    switch (activeTab) {
      case "Assigned":
        return task.status === "Pending" || task.status === "Ongoing" || task.status === "Returned";
      case "To Be Reviewed":
        return task.status === "Turned in" || (task.status === "Completed" && !task.isApproved);
      case "Reviewed":
        return task.isApproved === true || task.status === "Approved";
      default:
        return false;
    }
  });

  const taskHeader =
    activeTab === "Assigned" ? "Assigned Tasks" :
      activeTab === "To Be Reviewed" ? "To Be Reviewed" :
        "Reviewed Tasks";

  const formatDisplayDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const handleTaskPress = (task) => {
    setSelectedTask(task);
    setChecklistVisible(true);
  };

  const handleAddTask = (newTask) => {
    setTasks([...tasks, newTask]);
    setAddModalVisible(false);
  };

  const handleEditTask = (updatedTask) => {
    const updatedTasks = tasks.map(t =>
      t.id === updatedTask.id ? updatedTask : t
    );
    setTasks(updatedTasks);
    setEditModalVisible(false);
  };

  const handleDeleteTask = (taskId) => {
    const updatedTasks = tasks.filter(t => t.id !== taskId);
    setTasks(updatedTasks);
  };

  const handleApproveTask = (task, approveData) => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const formattedTime = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const updatedTasks = tasks.map(t => {
      if (t.id === task.id) {
        return {
          ...t,
          status: "Approved",
          isApproved: true,
          approvedBy: approveData?.signature || "You",
          approvedDate: `${formattedDate} at ${formattedTime}`
        };
      }
      return t;
    });
    setTasks(updatedTasks);
  };

  const handleReturnTask = (task, returnData) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === task.id) {
        return {
          ...t,
          status: "Returned",
          returnComments: returnData?.comments || "Please revise findings",
          returnedBy: returnData?.signature || "Head Mechanic",
          returnedDate: new Date().toISOString(),
          isApproved: false
        };
      }
      return t;
    });
    setTasks(updatedTasks);
  };

  const renderTask = ({ item }) => {
    const showEditDelete = activeTab === "Assigned";

    return (
      <View>
        {/* Date Header */}
        <View style={{
          paddingVertical: 8,
          paddingHorizontal: 12,
          marginTop: 10,
          borderTopLeftRadius: 4,
          borderTopRightRadius: 4,
        }}>
          <Text style={{ fontWeight: "600", fontSize: 16 }}>
            {formatDisplayDate(item.dueDate)}
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
          style={[styles.searchInput, { flex: 1 }]}
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
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 20 }}>
              No tasks in this tab
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
        taskOptions={taskOptions}
      />

      <EditTask
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        task={selectedTask}
        onSave={handleEditTask}
        employees={employees}
        taskOptions={taskOptions}
      />
    </View>
  );
}