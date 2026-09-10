import React from "react";
import { Platform } from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
} from "react-native-safe-area-context";

export default function IosModalSafeAreaProvider({ children }) {
  if (Platform.OS !== "ios") {
    return children;
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      {children}
    </SafeAreaProvider>
  );
}
