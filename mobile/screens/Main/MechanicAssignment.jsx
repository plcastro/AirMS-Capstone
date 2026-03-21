import React from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { styles } from "../../stylesheets/styles";
import { COLORS } from "../../stylesheets/colors";

export default function MechanicAssignment({ mechanic, tasks = [], onBack }) {
  const assignedTasks = tasks.filter((task) => task.assignedTo === mechanic.id);

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
  const calculateOverdueTime = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = now - due;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 24) {
      return `Overdue by ${diffHours} hour${diffHours !== 1 ? "s" : ""}`;
    } else {
      return `Overdue by ${diffDays} day${diffDays !== 1 ? "s" : ""}`;
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

  // Format due time
  const formatDueTime = (dueDate) => {
    const date = new Date(dueDate);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const renderTaskItem = ({ item }) => {
    const now = new Date();
    const dueDate = new Date(item.dueDate);
    const isPastDue =
      dueDate < now &&
      item.status !== "Completed" &&
      item.status !== "Turned in";
    const overdueText = isPastDue ? calculateOverdueTime(item.dueDate) : null;
    const dueTime = formatDueTime(item.dueDate);

    return (
      <TouchableOpacity
        style={[styles.taskCard, { marginBottom: 8, padding: 15 }]}
      >
        {/* Task Title and Status Badge */}
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

          {/* Show Returned badge for returned tasks */}
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
                style={{
                  color: "#c62828",
                  fontWeight: "500",
                  fontSize: 12,
                }}
              >
                Returned
              </Text>
            </View>
          )}

          {/* Show Completed/Turned in badge */}
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
                style={{
                  color: "#2e7d32",
                  fontWeight: "500",
                  fontSize: 12,
                }}
              >
                Turned in
              </Text>
            </View>
          )}
        </View>

        {/* Aircraft */}
        <Text style={{ color: "#666", fontSize: 14, marginBottom: 4 }}>
          Aircraft: {item.aircraft}
        </Text>

        {/* Due Date */}
        <Text style={{ color: "#666", fontSize: 14, marginBottom: 4 }}>
          Date Due: {formatDate(item.dueDate)}
        </Text>

        {/* Overdue Text - Only show if overdue */}
        {isPastDue && (
          <Text style={{ color: "#ff6b6b", fontSize: 14, marginTop: 4 }}>
            {overdueText} • Due at {dueTime}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingHorizontal: 15 }]}>
      {/* Back Button and Mechanic Header */}
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
          style={{
            marginRight: 15,
            padding: 5,
          }}
        >
          <Text style={{ fontSize: 24, color: COLORS.primaryLight }}>←</Text>
        </TouchableOpacity>

        {/* Avatar */}
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

        {/* Mechanic Info */}
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
          <Text style={{ color: COLORS.grayDark, fontSize: 16 }}>Mechanic</Text>
        </View>
      </View>

      <View style={[styles.taskTableHeader, { marginBottom: 15 }]}>
        <Text style={{ color: "#fff", fontWeight: "500", fontSize: 16 }}>
          Assigned Tasks ({assignedTasks.length})
          Assigned Tasks ({assignedTasks.length})
        </Text>
      </View>

      {/* Tasks List */}
      <View style={styles.taskTable}>
        <FlatList
          data={assignedTasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTaskItem}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 50 }}>
              <Text style={{ color: COLORS.grayDark, fontSize: 16 }}>
                No tasks assigned to this mechanic
              </Text>
            </View>
          }
        />
      </View>
      <View style={styles.taskTable}>
        <FlatList
          data={assignedTasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTaskItem}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 50 }}>
              <Text style={{ color: COLORS.grayDark, fontSize: 16 }}>
                No tasks assigned to this mechanic
              </Text>
            </View>
          }
        />
      </View>
    </View>
  );
}