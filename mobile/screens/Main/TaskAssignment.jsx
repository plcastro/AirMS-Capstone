import React, { useContext } from "react";
import { AuthContext } from "../../Context/AuthContext";
import HeadTaskScreen from "./HeadTaskScreen";
import MechanicTaskScreen from "./MechanicTaskScreen";
import { resolveUserRole } from "../../../shared/navigationAccess";
export default function TaskAssignment({ route }) {
  const { user } = useContext(AuthContext);
  const targetTaskId = route?.params?.targetTaskId;
  const targetNotificationStatus = route?.params?.notificationStatus;
  const addTaskDraft =
    route?.params?.openAddTask === "1" || route?.params?.openAddTask === true
      ? {
          aircraft: route?.params?.aircraft || "",
          aircraftModel: route?.params?.aircraftModel || "",
          inspectionName: route?.params?.inspectionName || "",
          issueTitle: route?.params?.issueTitle || "",
          component: route?.params?.component || "",
          riskLevel: route?.params?.riskLevel || "",
          recommendedAction: route?.params?.recommendedAction || "",
          manualReference: route?.params?.manualReference || "",
          draftType: route?.params?.draftType || "",
          dueDate: route?.params?.dueDate || "",
          dueAtHours: route?.params?.dueAtHours ?? null,
          remainingHours: route?.params?.remainingHours ?? null,
          remainingDays: route?.params?.remainingDays ?? null,
          dueStatus: route?.params?.dueStatus || "",
        }
      : null;

  const userRole = resolveUserRole(user);

  if (["maintenance manager", "superadmin"].includes(userRole)) {
    return (
      <HeadTaskScreen
        targetTaskId={targetTaskId}
        targetNotificationStatus={targetNotificationStatus}
        addTaskDraft={addTaskDraft}
      />
    );
  }

  return (
    <MechanicTaskScreen
      targetTaskId={targetTaskId}
      targetNotificationStatus={targetNotificationStatus}
    />
  );
}
