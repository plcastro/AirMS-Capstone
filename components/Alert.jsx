import React from "react";
import { StyleSheet, Button, Alert } from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";

export default function AlertComp({ title, message, onPressFunction }) {
  const createTwoButtonAlert = () =>
    Alert.alert(title, message, [
      {
        text: "Cancel",
        onPress: () => onPressFunction(false),
        style: "cancel",
      },
      { text: "OK", onPress: () => onPressFunction(true) },
    ]);
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <Button title={"2-Button Alert"} onPress={createTwoButtonAlert} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-around",
    alignItems: "center",
  },
});
