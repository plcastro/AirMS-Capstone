import React, { useContext } from "react";
import { AuthContext } from "../../Context/AuthContext";
import HeadTaskScreen from "./HeadTaskScreen";
import MechanicTaskScreen from "./MechanicTaskScreen";
export default function TaskAssignment() {
  const { user } = useContext(AuthContext);

  if (user?.jobTitle?.toLowerCase() === "maintenance manager") {
    return <HeadTaskScreen />;
  }

  return <MechanicTaskScreen />;
}
