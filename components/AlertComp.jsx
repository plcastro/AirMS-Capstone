import React, { useEffect, useState } from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";
import { styles } from "../stylesheets/styles";

export default function AlertComp({
  title,
  message,
  type = "alert", // alert | confirm
  alertType = "alert", // alert style: alert | success | error
  duration,
  onConfirm,
  onCancel,
  onFinish,
  confirmText = "YES",
  cancelText = "CANCEL",
  containerStyle = {},
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (type === "alert" && message) {
      const timer = setTimeout(() => {
        setVisible(false);
        if (onFinish) onFinish();
      }, duration);

      return () => clearTimeout(timer); // cleanup
    }
    return () => {}; // <-- always return a function
  }, [message, type, duration, onFinish]);

  const handleConfirm = () => {
    setVisible(false);
    if (onConfirm) onConfirm();
  };

  const handleCancel = () => {
    setVisible(false);
    if (onCancel) onCancel();
  };

  if (!visible) return null;

  // Color based on alertType
  const backgroundColor =
    alertType === "success"
      ? "#28a745"
      : alertType === "error"
        ? "#dc3545"
        : alertType === "warning"
          ? "#cca805"
          : "#26866F"; // default alert color

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={[styles.alertOverlay, containerStyle]}>
        <View style={[styles.alertContainer, { backgroundColor }]}>
          {title ? <Text style={styles.alertTitle}>{title}</Text> : null}
          {message ? <Text style={styles.alertMessage}>{message}</Text> : null}

          {type === "confirm" && (
            <View style={styles.alertButtonRow}>
              <TouchableOpacity
                style={styles.alertConfirmBtn}
                onPress={handleConfirm}
              >
                <Text style={styles.alertConfirmBtnText}>{confirmText}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.alertCancelBtn}
                onPress={handleCancel}
              >
                <Text style={styles.alertCancelBtnText}>{cancelText}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
