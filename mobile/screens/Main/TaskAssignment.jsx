import React, { useContext } from "react";
import { AuthContext } from "../../Context/AuthContext";
import HeadTaskScreen from "./HeadTaskScreen";
import MechanicTaskScreen from "./MechanicTaskScreen";
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
        }
      : null;

  if (user?.jobTitle?.toLowerCase() === "maintenance manager") {
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
