import { View, ScrollView, Text, RefreshControl } from "react-native";
import React, { useState, useContext } from "react";
import TaskCard from "./TaskCard";
import Button from "../Button";
import { styles } from "../../stylesheets/styles";
import { AuthContext } from "../../Context/AuthContext";
import AddTask from "./AddTask";
import EditTask from "./EditTask";

export default function TaskTabs({
  tasks,
  employees = [],
  onTaskPress,
  onRefresh,
  refreshing = false,
}) {
  const { user } = useContext(AuthContext);
  const isHead = user?.jobTitle?.toLowerCase() === "maintenance manager";

  const mechanicTabs = ["Upcoming", "Past Due", "Completed"];
  const headTabs = ["Tasks", "Submitted"];
  const [activeTab, setActiveTab] = useState(isHead ? "Tasks" : "Upcoming");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const now = new Date();

  const formatDisplayDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const filterTasks = () => {
    if (isHead) {
      switch (activeTab) {
        case "Tasks":
          return tasks;
        case "Submitted":
          return tasks.filter(
            (t) => t.status === "Completed" || t.status === "Turned in",
          );
        default:
          return [];
      }
    } else {
      return tasks.filter((task) => {
        const deadline = task.endDateTime || task.dueDate;
        if (!deadline) return false;
        const dueDate = new Date(deadline);
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );
        const isPastDue = dueDate < today;

        switch (activeTab) {
          case "Upcoming":
            return (
              (task.status === "Pending" ||
                task.status === "Returned" ||
                task.status === "Ongoing") &&
              !isPastDue
            );
          case "Past Due":
            return (
              (task.status === "Pending" ||
                task.status === "Returned" ||
                task.status === "Ongoing") &&
              isPastDue
            );
          case "Completed":
            return task.status === "Completed" || task.status === "Turned in";
          default:
            return false;
        }
      });
    }
  };

  const getMechanicTabCount = (tab) =>
    tasks.filter((task) => {
      const deadline = task.endDateTime || task.dueDate;
      if (!deadline) return false;

      const dueDate = new Date(deadline);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const isPastDue = dueDate < today;

      switch (tab) {
        case "Upcoming":
          return (
            (task.status === "Pending" ||
              task.status === "Returned" ||
              task.status === "Ongoing") &&
            !isPastDue
          );
        case "Past Due":
          return (
            (task.status === "Pending" ||
              task.status === "Returned" ||
              task.status === "Ongoing") &&
            isPastDue
          );
        case "Completed":
          return task.status === "Completed" || task.status === "Turned in";
        default:
          return false;
      }
    }).length;

  const getTabLabel = (tab) =>
    isHead ? tab : `${tab} (${getMechanicTabCount(tab)})`;

  const getGroupedTasks = () => {
    if (isHead) return [];

    const filtered = filterTasks();
    const grouped = {};

    filtered.forEach((task) => {
      const deadline = task.endDateTime || task.dueDate;
      const date = new Date(deadline);
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
    if (action === "start") {
      onTaskPress?.(task);
    } else if (action === "edit") {
      setSelectedTask(task);
      setShowEditModal(true);
    }
  };

  const taskHeader =
    activeTab === "Upcoming"
      ? "Upcoming Tasks"
      : activeTab === "Past Due"
        ? "Past Due"
        : activeTab === "Completed"
          ? "Completed"
          : activeTab === "Tasks"
            ? "Task Orders"
            : activeTab === "Submitted"
              ? "Submitted Tasks"
              : "Tasks";

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
            label={getTabLabel(tab)}
            onPress={() => setActiveTab(tab)}
            buttonStyle={[
              activeTab === tab ? styles.primaryAlertBtn : styles.secondaryBtn,
              { minWidth: 120, paddingHorizontal: 2 },
            ]}
            buttonTextStyle={[
              activeTab === tab ? styles.primaryBtnTxt : styles.secondaryBtnTxt,
              { fontSize: 12 },
            ]}
          />
        ))}

        {/* Head: Add Task button */}
        {isHead && (
          <Button
            label="+ Add Task"
            onPress={() => setShowAddModal(true)}
            buttonStyle={[styles.unifiedActionButton, { width: 130 }]}
            buttonTextStyle={styles.primaryBtnTxt}
          />
        )}
      </View>

      {/* Task List */}
      <View style={styles.taskTable}>
        <ScrollView
          contentContainerStyle={{ padding: 10 }}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            ) : undefined
          }
        >
          {!isHead && groupedTasks.length > 0
            ? groupedTasks.map((section) => (
                <View key={section.title}>
                  <View
                    style={{
                      paddingVertical: 2,
                      paddingHorizontal: 6,
                      marginBottom: 5,
                      borderTopLeftRadius: 4,
                      borderTopRightRadius: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "700",
                        fontSize: 12,
                      }}
                    >
                      {section.title}
                    </Text>
                  </View>

                  {section.data.map((task) => (
                    <TaskCard
                      key={task.id}
                      data={task}
                      variant={getCardVariant()}
                      onPress={onTaskPress}
                      onStartTask={() => handleTaskAction(task, "start")}
                      onEditTask={() => handleTaskAction(task, "edit")}
                      onDeleteTask={() => handleTaskAction(task, "delete")}
                    />
                  ))}
                </View>
              ))
            : tasksToRender.map((task) => (
                <TaskCard
                  key={task.id}
                  data={task}
                  variant={getCardVariant()}
                  onPress={onTaskPress}
                  onStartTask={() => handleTaskAction(task, "start")}
                  onEditTask={() => handleTaskAction(task, "edit")}
                  onDeleteTask={() => handleTaskAction(task, "delete")}
                />
              ))}

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
              setShowAddModal(false);
            }}
            employees={employees}
          />

          <EditTask
            visible={showEditModal}
            onClose={() => setShowEditModal(false)}
            onSave={(updatedTask) => {
              setShowEditModal(false);
            }}
            task={selectedTask}
            employees={employees}
          />
        </>
      )}
    </View>
  );
}
