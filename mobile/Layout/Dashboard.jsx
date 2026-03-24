import React, { useContext } from "react";
import { ScrollView } from "react-native";
import { AuthContext } from "../Context/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";

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
