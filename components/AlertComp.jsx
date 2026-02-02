import React, { useEffect, useState } from "react";
import { Modal, View, Text, StyleSheet } from "react-native";

export default function AlertComp({
  title,
  message,
  duration = 1500,
  onFinish,
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setVisible(false);
        if (onFinish) onFinish(); // callback after auto-dismiss
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 8,

    alignItems: "center",
    alignSelf: "center",
  },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  message: { fontSize: 14, textAlign: "center" },
});
