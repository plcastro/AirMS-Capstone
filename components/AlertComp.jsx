import React from "react";
import { View, Text, StyleSheet, Modal } from "react-native";
import Button from "./Button";

export default function AlertComp({
  visible,
  onClose,
  title,
  message,
  onConfirm,
}) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose} // Android back button
    >
      <View style={styles.overlay}>
        <View style={styles.alertContainer}>
          <Text style={styles.title}>{title || "Alert"}</Text>
          <Text style={styles.message}>
            {message || "This is an alert message."}
          </Text>

          <View style={styles.buttonRow}>
            <Button
              title="Yes"
              use={() => {
                onConfirm && onConfirm();
                onClose();
              }}
            />
            <Button title="Cancel" use={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertContainer: {
    width: 300,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  message: { fontSize: 16, marginBottom: 15, textAlign: "center" },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
});
