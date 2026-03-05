import { View, ScrollView, Text } from "react-native";
import React, { useState, useContext } from "react";
import TaskCard from "./TaskCard";
import Button from "../Button";
import { styles } from "../../stylesheets/styles";
import { AuthContext } from "../../Context/AuthContext";
import AddTask from "./AddTask";
import EditTask from "./EditTask";

export default function TaskTabs({ tasks, employees = [], taskOptions = [], onTaskPress }) {
  const { user } = useContext(AuthContext);
  const isHead = user?.position === "head of maintenance";

  const mechanicTabs = ["Upcoming", "Past Due", "Completed"];
  const headTabs = ["Tasks", "Submitted"];
  const [activeTab, setActiveTab] = useState(isHead ? "Tasks" : "Upcoming");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const now = new Date();

  // Helper function to format date
  const formatDisplayDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter tasks based on active tab and user type
  const filterTasks = () => {
    if (isHead) {
      switch (activeTab) {
        case "Tasks":
          return tasks;
        case "Submitted":
          return tasks.filter((t) => t.status === "Completed" || t.status === "Turned in");
        default:
          return [];
      }
    } else {
      // Mechanic filtering
      return tasks.filter((task) => {
        const dueDate = new Date(task.dueDate);
        const isPastDue = dueDate < now;

        switch (activeTab) {
          case "Upcoming":
            // Show Pending, Returned, or Ongoing tasks that are NOT past due
            return (task.status === "Pending" || task.status === "Returned" || task.status === "Ongoing") && !isPastDue;
          case "Past Due":
            // Show Pending, Returned, or Ongoing tasks that ARE past due
            return (task.status === "Pending" || task.status === "Returned" || task.status === "Ongoing") && isPastDue;
          case "Completed":
            // Show Completed or Turned in tasks
            return task.status === "Completed" || task.status === "Turned in";
          default:
            return false;
        }
      });
    }
  };

  // Group tasks by due date
  const getGroupedTasks = () => {
    if (isHead) return [];

    const filtered = filterTasks();
    const grouped = {};

    filtered.forEach((task) => {
      const date = new Date(task.dueDate);
      const formattedDate = formatDisplayDate(date);

      if (!grouped[formattedDate]) {
        grouped[formattedDate] = [];
      }
      grouped[formattedDate].push(task);
    });

    return Object.keys(grouped)
      .sort((a, b) => {
        const dateA = new Date(a);
        const dateB = new Date(b);
        return activeTab === "Completed" ? dateB - dateA : dateA - dateB;
      })
      .map((date) => ({
        title: date,
        data: grouped[date],
      }));
  };

  const getCardVariant = () => {
    if (isHead) return "default";
    if (activeTab === "Upcoming") return "upcoming";
    if (activeTab === "Past Due") return "pastdue";
    if (activeTab === "Completed") return "completed";
    return "default";
  };

  const tasksToRender = filterTasks();
  const tabsToRender = isHead ? headTabs : mechanicTabs;
  const groupedTasks = getGroupedTasks();

  const handleTaskAction = (task, action) => {
    if (action === 'start') {
      onTaskPress?.(task);
    } else if (action === 'edit') {
      setSelectedTask(task);
      setShowEditModal(true);
    } else if (action === 'delete') {
      console.log("Delete task", task.id);
    }
  };

  // Get header text based on active tab
  const taskHeader =
    activeTab === "Upcoming" ? "Upcoming Tasks" :
      activeTab === "Past Due" ? "Past Due" :
        activeTab === "Completed" ? "Completed" :
          activeTab === "Tasks" ? "Task Orders" :
            activeTab === "Submitted" ? "Submitted Tasks" :
              "Tasks";

  return (
    <View style={{ flex: 1 }}>
      {/* Tabs - Using Button component for styling */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          marginBottom: 25,
          gap: 5,
        }}
      >
        {tabsToRender.map((tab) => (
          <Button
            key={tab}
            label={tab}
            onPress={() => setActiveTab(tab)}
            buttonStyle={[
              activeTab === tab ? styles.primaryAlertBtn : styles.secondaryBtn,
              { width: 120 }, // Fixed width from your original
            ]}
            buttonTextStyle={[
              activeTab === tab ? styles.primaryBtnTxt : styles.secondaryBtnTxt,
              { fontSize: 14 },
            ]}
          />
        ))}

        {/* Head: Add Task button */}
        {isHead && (
          <Button
            label="+ Add Task"
            onPress={() => setShowAddModal(true)}
            buttonStyle={[styles.primaryAlertBtn, { width: 120 }]}
            buttonTextStyle={styles.primaryBtnTxt}
          />
        )}
      </View>

      {/* Header */}
      <View style={styles.taskTableHeader}>
        <Text style={{ color: "#fff", fontWeight: "500", fontSize: 16 }}>
          {taskHeader}
        </Text>
      </View>

      {/* Task List */}
      <View style={styles.taskTable}>
        <ScrollView contentContainerStyle={{ padding: 10 }}>
          {!isHead && groupedTasks.length > 0 ? (
            groupedTasks.map((section) => (
              <View key={section.title}>
                {/* Date Header - OUTSIDE the task card */}
                <View style={{
                  paddingVertical: 2,
                  paddingHorizontal: 6,
                  marginBottom: 5,
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                }}>
                  <Text style={{
                    fontWeight: "700",
                    fontSize: 17,
                  }}>
                    {section.title}
                  </Text>
                </View>

                {/* Tasks in this section - cards WITHOUT date header inside */}
                {section.data.map((task) => (
                  <TaskCard
                    key={task.id}
                    data={task}
                    variant={getCardVariant()}
                    onPress={onTaskPress}  // ADD THIS LINE - makes card pressable to open checklist
                    onStartTask={() => handleTaskAction(task, 'start')}
                    onEditTask={() => handleTaskAction(task, 'edit')}
                    onDeleteTask={() => handleTaskAction(task, 'delete')}
                  />
                ))}
              </View>
            ))
          ) : (
            tasksToRender.map((task) => (
              <TaskCard
                key={task.id}
                data={task}
                variant={getCardVariant()}
                onPress={onTaskPress}  // ADD THIS LINE - makes card pressable to open checklist
                onStartTask={() => handleTaskAction(task, 'start')}
                onEditTask={() => handleTaskAction(task, 'edit')}
                onDeleteTask={() => handleTaskAction(task, 'delete')}
              />
            ))
          )}

          {tasksToRender.length === 0 && (
            <Text style={{ textAlign: "center", marginTop: 20 }}>
              No tasks available
            </Text>
          )}
        </ScrollView>
      </View>

      {/* Add Task Modal - only render for head */}
      {isHead && (
        <>
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
        </>
      )}
    </View>
  );
}