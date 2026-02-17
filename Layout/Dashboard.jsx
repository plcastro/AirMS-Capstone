import React, { useContext } from "react";
import { ScrollView, Text, View } from "react-native";
import { AuthContext } from "../Context/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";

import FlightLog from "../screens/Main/FlightLog";
import UserManagement from "../screens/Admin/UserManagement";
import Profile from "../screens/Settings/Profile";

export default function Dashboard({ children }) {
  const { user } = useContext(AuthContext);
  if (!user) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ececec" }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
