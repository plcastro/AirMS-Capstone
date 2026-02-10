import React, { useContext } from "react";
import { ScrollView, Text, View } from "react-native";
import { AuthContext } from "../Context/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";

import FlightLog from "../screens/Main/FlightLog";
import UserManagement from "../screens/Admin/UserManagement";
import Profile from "../screens/Profile";

export default function Dashboard({ children }) {
  const { user } = useContext(AuthContext);
  if (!user) return null; // loader if needed
  console.log(user.position);
  // Position-based dashboard content
  const renderMainModule = () => {
    switch (user.position) {
      case "Admin":
        return <UserManagement />;
      case "Pilot":
      case "Head of Maintenance":
      case "Manager":
        return <FlightLog />;
      case "Mechanic":
        return <Profile />;
      default:
        return <Profile />;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ececec" }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* If children are passed, render them, otherwise render main dashboard module */}
        {children || renderMainModule()}
      </ScrollView>
    </SafeAreaView>
  );
}
