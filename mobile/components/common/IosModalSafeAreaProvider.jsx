import React from "react";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function IosModalSafeAreaProvider({ children }) {
  if (Platform.OS !== "ios") {
    return children;
  }

  return <SafeAreaProvider>{children}</SafeAreaProvider>;
}
