import React, { useState } from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { styles } from "../../stylesheets/styles";
import { COLORS } from "../../stylesheets/colors";

export default function MechanicAssignment({ mechanic, tasks = [], onBack }) {
  const [activeTab, setActiveTab] = useState("Ongoing");
  const isCompletedTask = (task) =>
    ["completed", "turned in", "approved"].includes(
      task?.status?.toLowerCase?.() || "",
    );
  const assignedTasks = tasks.filter(
    (task) => String(task.assignedTo) === String(mechanic.id),
  );
  const visibleTasks = assignedTasks.filter((task) =>
    activeTab === "Completed" ? isCompletedTask(task) : !isCompletedTask(task),
  );

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "Due Soon":
        return "#e66f00";
      case "Normal":
        return "#1f96ff";
      case "Overdue":
        return "#ff0000";
      default:
        return "gray";
    }
  };

  // Calculate overdue time (days or hours)
  const calculateOverdueTime = (deadline) => {
    const now = new Date();
    const due = new Date(deadline);
    const diffMs = now - due;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 24) {
      return `Submitted late by ${diffHours} hour${diffHours !== 1 ? "s" : ""}`;
    } else {
      return `Submitted late by ${diffDays} day${diffDays !== 1 ? "s" : ""}`;
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
    const formattedTime = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${formattedDate} ${formattedTime}`;
  };

  // Format due time
  const formatDueTime = (deadline) => {
    const date = new Date(deadline);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const renderTaskItem = ({ item }) => {
    const now = new Date();
    const deadlineValue = item.endDateTime || item.dueDate;
    const dueDate = new Date(deadlineValue);
    const isCompleted = isCompletedTask(item);
    const wasLate = isCompleted
      ? item.completedAt && new Date(item.completedAt) > dueDate
      : dueDate < now;
    const overdueText = wasLate ? calculateOverdueTime(deadlineValue) : null;
    const dueTime = formatDueTime(deadlineValue);

    return (
      <TouchableOpacity
        style={[styles.taskCard, { marginBottom: 8, padding: 15 }]}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              fontWeight: "bold",
              fontSize: 16,
              color: "#000",
              flex: 1,
              marginRight: 10,
            }}
          >
            {item.title} - {item.maintenanceType || "Corrective Maintenance"}
          </Text>

          {item.status === "Returned" && (
            <View
              style={{
                backgroundColor: "#ffebee",
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 4,
              }}
            >
              <Text
                style={{ color: "#c62828", fontWeight: "500", fontSize: 12 }}
              >
                Returned
              </Text>
            </View>
          )}

          {(item.status === "Completed" || item.status === "Turned in") && (
            <View
              style={{
                backgroundColor: "#e8f5e9",
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 4,
              }}
            >
              <Text
                style={{ color: "#2e7d32", fontWeight: "500", fontSize: 12 }}
              >
                Turned in
              </Text>
            </View>
          )}
        </View>

        <Text style={{ color: "#666", fontSize: 14, marginBottom: 4 }}>
          Aircraft: {item.aircraft}
        </Text>
        <Text style={{ color: "#666", fontSize: 14, marginBottom: 4 }}>
          Due: {formatDateTime(deadlineValue)}
        </Text>

        {wasLate && (
          <Text style={{ color: "#ff6b6b", fontSize: 14, marginTop: 4 }}>
            {overdueText} | Due at {dueTime}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.container,
        { paddingHorizontal: 7, flex: 1, backgroundColor: "#f5f5f5" },
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 20,
          paddingBottom: 15,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
        }}
      >
        <TouchableOpacity
          onPress={onBack}
          style={{ marginRight: 15, padding: 5 }}
        >
          <Text style={{ fontSize: 24, color: COLORS.primaryLight }}>
            {"<"}
          </Text>
        </TouchableOpacity>

        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: COLORS.primaryLight,
            justifyContent: "center",
            alignItems: "center",
            marginRight: 15,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 24, fontWeight: "bold" }}>
            {mechanic.name.charAt(0)}
          </Text>
        </View>

        <View>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              marginBottom: 4,
              color: COLORS.black,
            }}
          >
            {mechanic.name}
          </Text>
          <Text style={{ color: COLORS.grayDark, fontSize: 16 }}>
            {mechanic.jobTitle || "Mechanic"}
          </Text>
        </View>
      </View>

      <View style={[styles.taskTableHeader, { marginBottom: 15 }]}>
        <Text style={{ color: "#fff", fontWeight: "500", fontSize: 16 }}>
          {activeTab} Tasks ({visibleTasks.length})
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        {["Ongoing", "Completed"].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 6,
              alignItems: "center",
              backgroundColor:
                activeTab === tab ? COLORS.primaryLight : COLORS.white,
              borderWidth: 1,
              borderColor:
                activeTab === tab ? COLORS.primaryLight : COLORS.border,
            }}
          >
            <Text
              style={{
                color: activeTab === tab ? "#fff" : COLORS.grayDark,
                fontWeight: "600",
              }}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={visibleTasks}
        keyExtractor={(item) => String(item.id || item._id)}
        renderItem={renderTaskItem}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 50 }}>
            <Text style={{ color: COLORS.grayDark, fontSize: 16 }}>
              No {activeTab.toLowerCase()} tasks assigned to this mechanic
            </Text>
          </View>
        }
      />
    </View>
  );
}
