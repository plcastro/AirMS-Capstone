import { View, Text, TouchableOpacity } from "react-native";
import React, { useContext } from "react";
import * as Progress from "react-native-progress";
import { styles } from "../../stylesheets/styles";
import Button from "../Button";
import { AuthContext } from "../../Context/AuthContext";
import { COLORS } from "../../stylesheets/colors";

export default function TaskCard({
  data,
  onStartTask,
  onEditTask,
  onDeleteTask,
  onReviewTask,
  onPress,
  onApprove,
  onReturn,
  isHeadView = false,
  showEditDelete = false,
  variant = "default",
}) {
  const {
    title,
    dueDate,
    startDateTime,
    status,
    aircraft,
    maintenanceType,
    assignedToName,
    returnComments,
    checklistItems,
    checklistState,
  } = data;
  const { user } = useContext(AuthContext);

  console.log(title);

  // Calculate progress for ongoing tasks
  const calculateProgress = () => {
    if (!checklistItems || checklistItems.length === 0) return 0;

    // If we have saved checklistState, use that, otherwise assume none checked
    const checkedCount = checklistState
      ? checklistState.filter((item) => item).length
      : 0;
    return checkedCount / checklistItems.length;
  };

  const progress = calculateProgress();
  const progressPercentage = Math.round(progress * 100);

  const formatDateTime = (dateString) => {
    if (!dateString || dateString === "") return "Not set";
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const formattedTime = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${formattedDate} ${formattedTime}`;
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString || dateString === "") return "Not set";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Calculate overdue time (days or hours)
  const calculateOverdueTime = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = now - due;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 24) {
      return {
        value: diffHours,
        unit: "hour",
        text: `Overdue by ${diffHours} hour${diffHours !== 1 ? "s" : ""}`,
      };
    } else {
      return {
        value: diffDays,
        unit: "day",
        text: `Overdue by ${diffDays} day${diffDays !== 1 ? "s" : ""}`,
      };
    }
  };

  const formatDueTime = (dueDate) => {
    const date = new Date(dueDate);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const renderBaseCard = (children) => (
    <TouchableOpacity onPress={() => onPress?.(data)} activeOpacity={0.7}>
      <View style={[styles.taskCard, { marginBottom: 8, padding: 15 }]}>
        {children}
      </View>
    </TouchableOpacity>
  );

  if (variant === "upcoming") {
    return renderBaseCard(
      <>
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
            {aircraft} - {title || "Corrective Maintenance"}
          </Text>

          {status === "Returned" && (
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
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: status === "Ongoing" || status === "Returned" ? 8 : 0,
          }}
        >
          <Text style={{ color: "#666", fontSize: 14 }}>
            Aircraft: {aircraft}
          </Text>
          <Text style={{ color: "#666", fontSize: 14 }}>
            Start: {formatDateTime(startDateTime)}
          </Text>
        </View>

        {/* Progress Bar - Shows for ongoing and returned tasks */}
        {(status === "Ongoing" || status === "Returned") && (
          <View style={{ marginTop: 8, marginBottom: 8 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <Text style={{ fontSize: 12, color: "#666" }}>Progress</Text>
              <Text style={{ fontSize: 12, color: "#666", fontWeight: "500" }}>
                {progressPercentage}%
              </Text>
            </View>
            <Progress.Bar
              progress={progress}
              width={null}
              height={6}
              color={COLORS.primaryLight}
              unfilledColor="#e0e0e0"
              borderWidth={0}
              borderRadius={3}
            />
          </View>
        )}
      </>,
    );
  }

  if (variant === "pastdue") {
    const overdueTime = calculateOverdueTime(dueDate);
    const dueTime = formatDueTime(dueDate);

    return renderBaseCard(
      <>
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
            {title}
          </Text>

          {status === "Returned" && (
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
        </View>

        <Text style={{ color: "#666", fontSize: 14, marginBottom: 4 }}>
          Aircraft: {aircraft}
        </Text>

        <Text style={{ color: "#666", fontSize: 14, marginBottom: 4 }}>
          Start: {formatDateTime(startDateTime)}
        </Text>

        <Text style={{ color: "#ff6b6b", fontSize: 14, marginBottom: 8 }}>
          {overdueTime.text} • Due at {dueTime}
        </Text>

        {/* Progress Bar - Shows for ongoing and returned tasks in past due */}
        {(status === "Ongoing" || status === "Returned") && (
          <View style={{ marginTop: 4, marginBottom: 4 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <Text style={{ fontSize: 12, color: "#666" }}>Progress</Text>
              <Text style={{ fontSize: 12, color: "#666", fontWeight: "500" }}>
                {progressPercentage}%
              </Text>
            </View>
            <Progress.Bar
              progress={progress}
              width={null}
              height={6}
              color={COLORS.primaryLight}
              unfilledColor="#e0e0e0"
              borderWidth={0}
              borderRadius={3}
            />
          </View>
        )}
      </>,
    );
  }

  if (variant === "completed") {
    return renderBaseCard(
      <>
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
            {title}
          </Text>

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
        </View>

        <Text style={{ color: "#666", fontSize: 14, marginBottom: 4 }}>
          Aircraft: {aircraft}
        </Text>

        <Text style={{ color: "#666", fontSize: 14 }}>
          Start: {formatDateTime(startDateTime)}
        </Text>
      </>,
    );
  }

  // Default card (used for head view and ongoing tasks)
  return renderBaseCard(
    <>
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
          {aircraft} - {title || "Corrective Maintenance"}
        </Text>

        {/* Show Returned badge for returned tasks */}
        {status === "Returned" && (
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

        {/* Show Turned in badge for tasks that are turned in or completed */}
        {(status === "Turned in" || status === "Completed") && (
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

      <Text style={{ color: "#666", fontSize: 14, marginBottom: 4 }}>
        Aircraft: {aircraft}
      </Text>

      {assignedToName && isHeadView && (
        <Text style={{ color: "#666", fontSize: 14, marginBottom: 4 }}>
          Assigned to: {assignedToName}
        </Text>
      )}

      <Text style={{ color: "#666", fontSize: 14, marginBottom: 4 }}>
        Start: {formatDateTime(startDateTime)}
      </Text>

      {/* Progress Bar - Shows for ongoing tasks only */}
      {(status === "Ongoing" || status === "Returned") && (
        <View style={{ marginTop: 8, marginBottom: 8 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <Text style={{ fontSize: 12, color: "#666" }}>Progress</Text>
            <Text style={{ fontSize: 12, color: "#666", fontWeight: "500" }}>
              {progressPercentage}%
            </Text>
          </View>
          <Progress.Bar
            progress={progress}
            width={null}
            height={6}
            color={COLORS.primaryLight}
            unfilledColor="#e0e0e0"
            borderWidth={0}
            borderRadius={3}
          />
        </View>
      )}

      {/* Return comments if any */}
      {returnComments && isHeadView && (
        <View
          style={{
            backgroundColor: "#ffebee",
            padding: 8,
            borderRadius: 4,
            marginVertical: 8,
          }}
        >
          <Text style={{ color: "#c62828", fontSize: 12, fontWeight: "500" }}>
            Return comments: {returnComments}
          </Text>
        </View>
      )}

      {/* Due date only */}
      <Text style={{ color: "#666", fontSize: 13, marginTop: 4 }}>
        Due: {formatDisplayDate(dueDate)}
      </Text>

      {/* Edit/Delete buttons - only for head view on Assigned tab */}
      {showEditDelete && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 12,
          }}
        >
          <Button
            onPress={onEditTask}
            label="Edit"
            buttonStyle={[styles.neutralBtn, { width: 80 }]}
            buttonTextStyle={styles.primaryBtnTxt}
          />
          <Button
            onPress={onDeleteTask}
            label="Delete"
            buttonStyle={[styles.dangerBtn, { width: 80 }]}
            buttonTextStyle={styles.primaryBtnTxt}
          />
        </View>
      )}
    </>,
  );
}
