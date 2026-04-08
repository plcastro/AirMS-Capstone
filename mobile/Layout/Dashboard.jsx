import React, { useContext } from "react";
import { ScrollView } from "react-native";
import { AuthContext } from "../Context/AuthContext";

export default function Dashboard({ children }) {
  const { user } = useContext(AuthContext);
  if (!user) return null;

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}
