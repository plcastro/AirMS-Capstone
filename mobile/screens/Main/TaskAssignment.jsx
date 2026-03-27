import React, { useContext } from "react";
import { AuthContext } from "../../Context/AuthContext";
import HeadTaskScreen from "./HeadTaskScreen";
import MechanicTaskScreen from "./MechanicTaskScreen";
export default function TaskAssignment() {
  const { user } = useContext(AuthContext);

  if (user?.jobTitle === "Maintenance Manager") {
    return (
      <HeadTaskScreen
        taskOptions={[
          { id: "1", name: "Engine Inspection" },
          { id: "2", name: "Landing Gear Check" },
        ]}
      />
    );
  }

  return <MechanicTaskScreen />;
}
