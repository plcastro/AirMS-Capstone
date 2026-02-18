import { View, Text, ScrollView } from "react-native";
import React from "react";
import { styles } from "../../stylesheets/styles";
import Button from "../Button";

export default function TaskCard({ data, onStartTask }) {
  const { title, dueDate, startDateTime, endDateTime, priority, status } = data;

  const getStatusColor = () => {
    switch (status) {
      case "Ongoing":
        return "#c79d28";
      case "Pending":
        return "#1E88E5";
      case "Completed":
        return "#34A853";
    }
  };

  const getPriorityColor = () => {
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
  return (
    <View style={styles.taskCard}>
      <ScrollView>
        <View>
          <View style={styles.rowTaskContainer}>
            <Text style={{ fontWeight: "bold", fontSize: 15 }}>{title}</Text>
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: getStatusColor() },
              ]}
            >
              <Text style={styles.statusTxt}>{status}</Text>
            </View>
          </View>
          <Text>Date Due: {dueDate}</Text>
          <Text>Start Date/Time: {startDateTime}</Text>
          <Text>End Date/Time: {endDateTime}</Text>
          <Text style={{ color: getPriorityColor(), fontWeight: 500 }}>
            {priority}
          </Text>
          <View style={{ alignItems: "center", marginTop: 10 }}>
            {status !== "Completed" && (
              <Button
                onPress={onStartTask}
                label={status === "Pending" ? "Start Task" : "Continue Task"}
                buttonStyle={[styles.primaryAlertBtn, { width: 200 }]}
                buttonTextStyle={styles.primaryBtnTxt}
              />
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
