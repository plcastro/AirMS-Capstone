import React, { useContext } from "react";
import { View } from "react-native";
import { AuthContext } from "../Context/AuthContext";
export default function Dashboard({ children }) {
  const { user } = useContext(AuthContext);
  if (!user) return null;

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>{children}</View>
  );
}
