import {
  View,
  TouchableOpacity
} from "react-native";
import AppText from "../common/AppText";
import React from "react";
import * as Progress from "react-native-progress";
import ActionIconButton from "../common/ActionIconButton";
import { CardActionRow } from "../common/MobileModule";
import { COLORS } from "../../stylesheets/colors";

const getDisplayText = (value, fallback = "N/A") => {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (typeof value === "object") {
    return (
      value.name ||
      value.title ||
      value.tailNum ||
      value.aircraft ||
      value.rpc ||
      value.label ||
      value._id ||
      value.id ||
      fallback
    );
  }
  return String(value);
};

const normalizeStatus = (value) =>
  String(getDisplayText(value, ""))
    .trim()
    .toLowerCase();

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
    priority,
    returnComments,
    checklistItems,
    checklistState,
  } = data;

  const deadline = endDateTime || dueDate;
  const displayStatus = data?.isApproved
    ? "Approved"
    : getDisplayText(status, "Pending");
  const normalizedDisplayStatus = normalizeStatus(displayStatus);

  // Progress
  const safeChecklistItems = Array.isArray(checklistItems)
    ? checklistItems
    : [];
  const safeChecklistState = Array.isArray(checklistState)
    ? checklistState
    : [];
  const progress =
    safeChecklistItems.length > 0
      ? safeChecklistState.filter(Boolean).length / safeChecklistItems.length
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
        <AppText
          style={{
            fontSize: 13,
            fontWeight: "bold",
            color: "#000",
            flex: 1,
            marginRight: 10,
          }}
        >
          {getDisplayText(title || maintenanceType, "Maintenance Task")}
        </AppText>

        {/* STATUS */}
        <View
          style={{
            backgroundColor:
              normalizedDisplayStatus === "approved" ||
              normalizedDisplayStatus === "completed"
                ? "#E8F5E9"
                : normalizedDisplayStatus === "returned"
                  ? "#FFEBEE"
                  : "#FFF3E0",
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 12,
          }}
        >
          <AppText
            style={{
              fontSize: 10,
              fontWeight: "600",
              color:
                normalizedDisplayStatus === "approved" ||
                normalizedDisplayStatus === "completed"
                  ? "#2E7D32"
                  : normalizedDisplayStatus === "returned"
                    ? "#C62828"
                    : "#ED6C02",
            }}
          >
          {getDisplayText(displayStatus, "Pending")}
          </AppText>
        </View>
      </View>

      <View style={{ flexDirection: "row", marginBottom: 6 }}>
        <View
          style={{
            backgroundColor:
              getDisplayText(priority, "Normal") === "High"
                ? COLORS.dangerBg
                : getDisplayText(priority, "Normal") === "Low"
                  ? COLORS.successBg
                  : COLORS.infoBg,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 10,
          }}
        >
          <AppText
            style={{
              fontSize: 10,
              fontWeight: "700",
              color:
                getDisplayText(priority, "Normal") === "High"
                  ? COLORS.dangerBorder
                  : getDisplayText(priority, "Normal") === "Low"
                    ? COLORS.successBorder
                    : COLORS.infoBorder,
            }}
          >
            Priority: {getDisplayText(priority, "Normal")}
          </AppText>
        </View>
      </View>

      {/* BODY INFO */}
      <AppText style={{ fontSize: 12, color: "#555", marginBottom: 2 }}>
        Aircraft: {getDisplayText(aircraft)}
      </AppText>

      <AppText style={{ fontSize: 12, color: "#777", marginBottom: 2 }}>
        Start: {formatDate(startDateTime)}
      </AppText>

      <AppText style={{ fontSize: 12, color: "#777", marginBottom: 6 }}>
        Due: {formatDate(deadline)}
      </AppText>

      {/* PROGRESS */}
      {(normalizedDisplayStatus === "ongoing" ||
        normalizedDisplayStatus === "returned") && (
        <View style={{ marginTop: 6 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <AppText style={{ fontSize: 12, color: "#666" }}>Progress</AppText>
            <AppText style={{ fontSize: 12, color: "#666" }}>
              {progressPercentage}%
            </AppText>
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
        <AppText style={{ fontSize: 12, color: "#777", marginTop: 6 }}>
          Assigned to: {getDisplayText(assignedToName)}
        </AppText>
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
          <AppText style={{ fontSize: 12, color: "#C62828" }}>
            {getDisplayText(returnComments, "")}
          </AppText>
        </View>
      )}

      {/* ACTIONS */}
      {showEditDelete && (
        <CardActionRow>
          <ActionIconButton
            icon="pencil"
            tooltip="Edit"
            onPress={(event) => {
              event?.stopPropagation?.();
              onEditTask?.(data);
            }}
            color="#777"
            size={32}
            iconSize={21}
          />
          <ActionIconButton
            icon="delete"
            tooltip="Delete"
            onPress={(event) => {
              event?.stopPropagation?.();
              onDeleteTask?.(data);
            }}
            color="#F45B5B"
            size={32}
            iconSize={21}
          />
        </CardActionRow>
      )}
    </Card>
  );
}
