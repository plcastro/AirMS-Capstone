import React, { useState, useContext } from "react";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthContext } from "../Context/AuthContext";

import { useNavigation } from "@react-navigation/native";

export default function Dashboard({ children, title = "Dashboard" }) {
  const nav = useNavigation();
  const { user } = useContext(AuthContext);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}

      {/* Main content */}
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 15 }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
