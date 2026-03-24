import React, { useContext } from "react";
import { AuthContext } from "../../Context/AuthContext";
import HeadTaskScreen from "./HeadTaskScreen";
import MechanicTaskScreen from "./MechanicTaskScreen";
export default function TaskAssignment() {
  const { user } = useContext(AuthContext);

  // Head sees HeadTaskScreen
  if (user?.jobTitle.toLowerCase() === "maintenance manager") {
    return (
      <HeadTaskScreen
        taskOptions={[
          { id: "1", name: "Engine Inspection" },
          { id: "2", name: "Landing Gear Check" },
        ]}
      />
    );
  }

  // Mechanics see MechanicTaskScreen
  return <MechanicTaskScreen />;
}
