import React, { useContext } from "react";
import { AuthContext } from "../../Context/AuthContext";
import HeadTaskScreen from "./HeadTaskScreen";
import MechanicTaskScreen from "./MechanicTaskScreen";
import TaskInfo from "../../components/TaskAssignment.jsx/TaskInfo.jsx";
export default function TaskAssignment() {
  const { user } = useContext(AuthContext);
  console.log(TaskInfo);
  // Head sees HeadTaskScreen
  if (user?.position === "head of maintenance") {
    return (
      <HeadTaskScreen
        tasks={TaskInfo}
        employees={[
          { id: "1", name: "John Doe" },
          { id: "2", name: "Jane Smith" },
        ]}
        taskOptions={[
          { id: "1", name: "Engine Inspection" },
          { id: "2", name: "Landing Gear Check" },
        ]}
      />
    );
  }

  // Mechanics see MechanicTaskScreen
  return <MechanicTaskScreen tasks={TaskInfo} />;
}
