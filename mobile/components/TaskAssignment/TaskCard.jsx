import { View, Text, TouchableOpacity } from "react-native";
import React, { useContext } from "react";
import * as Progress from "react-native-progress";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AuthContext } from "../../Context/AuthContext";
import { COLORS } from "../../stylesheets/colors";

export default function TaskCard({
  data,
  onPress,
  onEditTask,
  onDeleteTask,
  showEditDelete = false,
}) {
  const {
    title,
    startDateTime,
    endDateTime,
    dueDate,
    status,
    aircraft,
    maintenanceType,
    assignedToName,
    returnComments,
    checklistItems,
    checklistState,
    completedAt,
  } = data;

  const deadline = endDateTime || dueDate;

  // Progress
  const progress =
    checklistItems?.length > 0
      ? (checklistState?.filter(Boolean).length || 0) / checklistItems.length
      : 0;

  const progressPercentage = Math.round(progress * 100);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const Card = ({ children }) => (
    <TouchableOpacity onPress={() => onPress?.(data)} activeOpacity={0.7}>
      <View
        style={{
          flexDirection: "row",
          backgroundColor: COLORS.white,
          borderRadius: 10,
          marginBottom: 12,
          elevation: 3,
          overflow: "hidden",
        }}
      >
        {/* LEFT ACCENT BAR */}
        <View
          style={{
            width: 5,
            backgroundColor: COLORS.primaryLight,
          }}
        />

        {/* CONTENT */}
        <View style={{ flex: 1, padding: 12 }}>{children}</View>
      </View>
    </TouchableOpacity>
  );

  return (
    <Card>
      {/* HEADER */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 6,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: "bold",
            color: "#000",
            flex: 1,
            marginRight: 10,
          }}
        >
          {title || maintenanceType || "Maintenance Task"}
        </Text>

        {/* STATUS */}
        <View
          style={{
            backgroundColor:
              status === "Completed"
                ? "#E8F5E9"
                : status === "Returned"
                  ? "#FFEBEE"
                  : "#FFF3E0",
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 12,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: "600",
              color:
                status === "Completed"
                  ? "#2E7D32"
                  : status === "Returned"
                    ? "#C62828"
                    : "#ED6C02",
            }}
          >
            {status}
          </Text>
        </View>
        <TouchableOpacity onPress={() => onDeleteTask?.(data)}>
          <MaterialCommunityIcons name="delete" size={21} color="#F45B5B" />
        </TouchableOpacity>
      </View>

      {/* BODY INFO */}
      <Text style={{ fontSize: 12, color: "#555", marginBottom: 2 }}>
        Aircraft: {aircraft}
      </Text>

      <Text style={{ fontSize: 12, color: "#777", marginBottom: 2 }}>
        Start: {formatDate(startDateTime)}
      </Text>

      <Text style={{ fontSize: 12, color: "#777", marginBottom: 6 }}>
        Due: {formatDate(deadline)}
      </Text>

      {/* PROGRESS */}
      {(status === "Ongoing" || status === "Returned") && (
        <View style={{ marginTop: 6 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <Text style={{ fontSize: 12, color: "#666" }}>Progress</Text>
            <Text style={{ fontSize: 12, color: "#666" }}>
              {progressPercentage}%
            </Text>
          </View>

          <Progress.Bar
            progress={progress}
            width={null}
            height={6}
            color={COLORS.primaryLight}
            unfilledColor="#E0E0E0"
            borderWidth={0}
            borderRadius={3}
          />
        </View>
      )}

      {/* ASSIGNED INFO */}
      {assignedToName && (
        <Text style={{ fontSize: 12, color: "#777", marginTop: 6 }}>
          Assigned to: {assignedToName}
        </Text>
      )}

      {/* RETURN COMMENTS */}
      {returnComments && (
        <View
          style={{
            backgroundColor: "#FFEBEE",
            padding: 8,
            borderRadius: 6,
            marginTop: 8,
          }}
        >
          <Text style={{ fontSize: 12, color: "#C62828" }}>
            {returnComments}
          </Text>
        </View>
      )}

      {/* ACTIONS */}
      {showEditDelete && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            marginTop: 10,
          }}
        >
          <TouchableOpacity onPress={() => onEditTask?.(data)}>
            <MaterialCommunityIcons name="pencil" size={21} color="#777" />
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );
}
