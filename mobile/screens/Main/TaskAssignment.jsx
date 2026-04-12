import React, { useContext } from "react";
import { AuthContext } from "../../Context/AuthContext";
import HeadTaskScreen from "./HeadTaskScreen";
import MechanicTaskScreen from "./MechanicTaskScreen";
export default function TaskAssignment({ route }) {
  const { user } = useContext(AuthContext);
  const targetTaskId = route?.params?.targetTaskId;
  const targetNotificationStatus = route?.params?.notificationStatus;

  if (user?.jobTitle?.toLowerCase() === "maintenance manager") {
    return (
      <HeadTaskScreen
        targetTaskId={targetTaskId}
        targetNotificationStatus={targetNotificationStatus}
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
