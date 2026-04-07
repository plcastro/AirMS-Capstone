import React, { useContext } from "react";
import { View } from "react-native";
import { AuthContext } from "../Context/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Dashboard({ children }) {
  const { user } = useContext(AuthContext);
  if (!user) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ececec" }}>
      <View style={{ flex: 1 }}>
        {children}
      </View>
    </SafeAreaView>
  );
}
