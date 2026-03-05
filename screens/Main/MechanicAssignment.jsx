import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { styles } from "../../stylesheets/styles";
import { COLORS } from "../../stylesheets/colors";

// Mock data for assigned tasks
const ASSIGNED_TASKS = [
  {
    id: "1",
    title: "Aileron Failure - Corrective Maintenance",
    dueDate: "03/02/2026",
    workHours: 8,
    priority: "Due Soon",
    status: "Pending",
  },
  {
    id: "2",
    title: "Engine Oil Change - Scheduled Maintenance",
    dueDate: "03/05/2026",
    workHours: 4,
    priority: "Normal",
    status: "Ongoing",
  },
  {
    id: "3",
    title: "Landing Gear Inspection",
    dueDate: "02/28/2026",
    workHours: 6,
    priority: "Due Soon",
    status: "Pending",
  },
  {
    id: "4",
    title: "Avionics System Check",
    dueDate: "03/10/2026",
    workHours: 5,
    priority: "Normal",
    status: "Completed",
  },
];

export default function MechanicAssignment({ mechanic, onBack }) {
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

  const getStatusColor = (status) => {
    switch (status) {
      case "Ongoing":
        return "#c79d28";
      case "Pending":
        return "#1E88E5";
      case "Completed":
        return "#34A853";
      default:
        return "gray";
    }
  };

  const renderTaskItem = ({ item }) => (
    <TouchableOpacity
      style={{
        backgroundColor: COLORS.grayLight,
        borderRadius: 4,
        padding: 15,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
      }}
    >
      {/* Task Title and Status */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Text style={{ fontWeight: "bold", fontSize: 15, flex: 1, color: COLORS.black }}>
          {item.title}
        </Text>
        <View
          style={{
            backgroundColor: getStatusColor(item.status),
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 4,
            marginLeft: 10,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "500" }}>
            {item.status}
          </Text>
        </View>
      </View>

      {/* Task Details */}
      <Text style={{ color: COLORS.grayDark, marginBottom: 4, fontSize: 14 }}>
        Date Due: {item.dueDate}
      </Text>
      <Text style={{ color: COLORS.grayDark, marginBottom: 4, fontSize: 14 }}>
        Work Hours: {item.workHours}
      </Text>
      <Text 
        style={{ 
          color: getPriorityColor(item.priority), 
          fontWeight: "600",
          fontSize: 14,
          marginTop: 4,
        }}
      >
        {item.priority}
      </Text>
    </TouchableOpacity>
  );

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
          <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 4, color: COLORS.black }}>
            {mechanic.name}
          </Text>
          <Text style={{ color: COLORS.grayDark, fontSize: 16 }}>Mechanic</Text>
        </View>
      </View>
      
      <View style={[styles.taskTableHeader, { marginBottom: 15 }]}>
        <Text style={{ color: "#fff", fontWeight: "500", fontSize: 16 }}>
          Assigned Tasks
        </Text>
      </View>

      {/* Tasks List */}
      <FlatList
        data={ASSIGNED_TASKS}
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
  );
}