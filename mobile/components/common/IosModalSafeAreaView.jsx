import React from "react";
import { Platform, View } from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";

export default function IosModalSafeAreaView({ children, ...viewProps }) {
  if (Platform.OS !== "ios") {
    return <View {...viewProps}>{children}</View>;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView {...viewProps}>{children}</SafeAreaView>
    </SafeAreaProvider>
  );
}
