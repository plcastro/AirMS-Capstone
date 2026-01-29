import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../stylesheets/styles";
import Icon from "react-native-vector-icons/Entypo";
import { useNavigation } from "@react-navigation/native";

export default function Dashboard({ children, title = "Dashboard" }) {
  const nav = useNavigation();

  const logout = () => {
    nav.replace("login");
  };

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
