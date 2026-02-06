import React, { useContext } from "react";
import { ScrollView, Text, View } from "react-native";
import { AuthContext } from "../Context/AuthContext";
import DashboardHeader from "../components/DashboardHeader";
import { SafeAreaView } from "react-native-safe-area-context";

// Screens you might render

import PartsMonitoring from "../screens/PartsMonitoring";
import FlightLog from "../screens/FlightLog";
import UserManagement from "../screens/UserManagement";
import Profile from "../screens/Profile";
// Props: pass children if you want to render any screen inside this layout
export default function Dashboard({ children }) {
  const { user } = useContext(AuthContext);
  if (!user) return null; // loader if needed

  // Role-based dashboard content
  const renderMainModule = () => {
    switch (user.role) {
      case "admin":
        return (
          <>
            <UserManagement />
          </>
        );
      case "superuser":
        return <FlightLog />;
      case "user":
        return <Profile />;
      default:
        return <Profile />;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ececec" }}>
      <DashboardHeader />

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
