import { View, Text, ScrollView } from "react-native";
import React, { useContext } from "react";
import { styles } from "../../stylesheets/styles";
import Button from "../Button";
import { AuthContext } from "../../Context/AuthContext";

export default function TaskCard({
  data,
  onStartTask,
  onEditTask,
  onDeleteTask,
  onReviewTask,
}) {
  const { title, dueDate, startDateTime, endDateTime, priority, status } = data;

  const { user } = useContext(AuthContext);

  const getStatusColor = () => {
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

          <Text style={{ color: getPriorityColor(), fontWeight: "500" }}>
            {priority}
          </Text>

          <View style={{ alignItems: "center", marginTop: 10 }}>
            {/* Mechanic View */}
            {user?.position === "mechanic" && status !== "Completed" && (
              <Button
                onPress={onStartTask}
                label={status === "Pending" ? "Start Task" : "Continue Task"}
                buttonStyle={[styles.primaryAlertBtn, { width: 200 }]}
                buttonTextStyle={styles.primaryBtnTxt}
              />
            )}

            {/* Head of Maintenance View */}
            {user?.position === "head of maintenance" && (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 10,
                  width: "100%",
                }}
              >
                <Button
                  onPress={onEditTask}
                  label="Edit"
                  buttonStyle={[styles.neutralBtn, { width: 100 }]}
                  buttonTextStyle={styles.primaryBtnTxt}
                />
                <Button
                  onPress={onDeleteTask}
                  label="Delete"
                  buttonStyle={[styles.dangerBtn, { width: 100 }]}
                  buttonTextStyle={styles.primaryBtnTxt}
                />
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
