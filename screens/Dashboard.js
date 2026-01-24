import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { styles } from "../stylesheets/styles";
import React, { useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import Checkbox from "expo-checkbox";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Dashboard() {
  const nav = useNavigation();
  const logout = () => {
    nav.replace("login");
  };
  return (
    <View>
      <Text>Dashboard</Text>
      <TouchableOpacity
        onPress={() => {
          logout();
        }}
      >
        <Text>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}
