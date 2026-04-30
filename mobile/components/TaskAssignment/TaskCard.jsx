import { View, Text, TouchableOpacity } from "react-native";
import React, { useContext } from "react";
import * as Progress from "react-native-progress";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { styles } from "../../stylesheets/styles";
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
    endDateTime,
    status,
    aircraft,
    maintenanceType,
    assignedToName,
    returnComments,
    checklistItems,
    checklistState,
    completedAt,
  } = data;
  const { user } = useContext(AuthContext);
  const deadline = endDateTime || dueDate;
  const submittedAt = completedAt;

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

  const formatDisplayDateTime = (dateString) => {
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

  const formatDuration = (diffMs) => {
    const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays >= 1) {
      return `${diffDays} day${diffDays !== 1 ? "s" : ""}`;
    }

    if (diffHours >= 1) {
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""}`;
    }

    return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""}`;
  };

  const getSubmissionTimingText = () => {
    if (!deadline || !submittedAt) return "";

    const due = new Date(deadline);
    const submitted = new Date(submittedAt);

    if (Number.isNaN(due.getTime()) || Number.isNaN(submitted.getTime())) {
      return "";
    }

    const diffMs = submitted - due;
    if (diffMs <= 0) return "Submitted on time";

    return `Submitted late by ${formatDuration(diffMs)}`;
  };

  const calculateOverdueTime = (deadlineValue) => {
    const compareDate = submittedAt ? new Date(submittedAt) : new Date();
    const due = new Date(deadlineValue);
    const diffMs = compareDate - due;

    if (Number.isNaN(due.getTime()) || diffMs <= 0) {
      return "Due now";
    }

    return submittedAt
      ? `Submitted late by ${formatDuration(diffMs)}`
      : `Overdue by ${formatDuration(diffMs)}`;
  };

  const formatDueTime = (deadlineValue) => {
    const date = new Date(deadlineValue);
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

  const renderScheduleDetails = ({ includeSubmitted = false } = {}) => {
    const submissionText = includeSubmitted ? getSubmissionTimingText() : "";
    const submissionColor = submissionText.includes("late")
      ? "#c62828"
      : "#2e7d32";

    return (
      <>
        <Text style={{ color: "#666", fontSize: 12, marginBottom: 4 }}>
          Due: {formatDisplayDateTime(deadline)}
        </Text>
        {includeSubmitted && (
          <>
            <Text style={{ color: "#666", fontSize: 12, marginBottom: 4 }}>
              Submitted: {formatDisplayDateTime(submittedAt)}
            </Text>
            {!!submissionText && (
              <Text
                style={{
                  color: submissionColor,
                  fontSize: 12,
                  marginBottom: 4,
                }}
              >
                {submissionText}
              </Text>
            )}
          </>
        )}
      </>
    );
  };

  const renderIconButton = ({ icon, color, label, onPress }) => (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={0.75}
      onPress={onPress}
      style={{ padding: 4, marginLeft: 2 }}
    >
      <MaterialCommunityIcons name={icon} size={20} color={color} />
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
              fontSize: 12,
              color: "#000",
              flex: 1,
              marginRight: 10,
            }}
          >
            {title || maintenanceType || "Corrective Maintenance"}
          </Text>

          {status === "Returned" && (
            <View
              style={{
                backgroundColor: "#ffebee",
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 10,
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
          <Text style={{ color: "#666", fontSize: 12 }}>
            Aircraft: {aircraft}
          </Text>
          <Text style={{ color: "#666", fontSize: 12 }}>
            Start: {formatDateTime(startDateTime)}
          </Text>
        </View>

        {renderScheduleDetails()}

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
    const overdueTime = calculateOverdueTime(deadline);
    const dueTime = formatDueTime(deadline);

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
              fontSize: 12,
              color: "#000",
              flex: 1,
              marginRight: 10,
            }}
          >
            {title || maintenanceType || "Corrective Maintenance"}
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

        <Text style={{ color: "#666", fontSize: 12, marginBottom: 4 }}>
          Aircraft: {aircraft}
        </Text>

        <Text style={{ color: "#666", fontSize: 12, marginBottom: 4 }}>
          Start: {formatDateTime(startDateTime)}
        </Text>

        <Text style={{ color: "#ff6b6b", fontSize: 12, marginBottom: 8 }}>
          {overdueTime} - Due at {dueTime}
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
              fontSize: 12,
              color: "#000",
              flex: 1,
              marginRight: 10,
            }}
          >
            {title || maintenanceType || "Corrective Maintenance"}
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

        <Text style={{ color: "#666", fontSize: 12, marginBottom: 4 }}>
          Aircraft: {aircraft}
        </Text>

        <Text style={{ color: "#666", fontSize: 12 }}>
          Start: {formatDateTime(startDateTime)}
        </Text>

        {renderScheduleDetails({ includeSubmitted: true })}
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
            fontSize: 12,
            color: "#000",
            flex: 1,
            marginRight: 10,
          }}
        >
          {title || maintenanceType || "Corrective Maintenance"}
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

      <Text style={{ color: "#666", fontSize: 12, marginBottom: 4 }}>
        Aircraft: {aircraft}
      </Text>

      {assignedToName && isHeadView && (
        <Text style={{ color: "#666", fontSize: 12, marginBottom: 4 }}>
          Assigned to: {assignedToName}
        </Text>
      )}

      <Text style={{ color: "#666", fontSize: 12, marginBottom: 4 }}>
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
            color={COLORS.successBorder}
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

      {renderScheduleDetails({
        includeSubmitted:
          status === "Turned in" ||
          status === "Completed" ||
          status === "Approved",
      })}

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
          {renderIconButton({
            icon: "pencil",
            color: "#777",
            label: "Edit task",
            onPress: onEditTask,
          })}
          {renderIconButton({
            icon: "delete",
            color: "#F45B5B",
            label: "Delete task",
            onPress: onDeleteTask,
          })}
        </View>
      )}
    </>,
  );
}
