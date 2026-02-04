import React, { useEffect, useState } from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";
import { styles } from "../stylesheets/styles";

export default function AlertComp({
  title,
  message,
  type = "alert",
  duration = 1500,
  onConfirm,
  onCancel,
  onFinish,
  confirmText = "YES",
  cancelText = "CANCEL",
  containerStyle = {}, // <-- add this
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (type === "alert" && message) {
      const timer = setTimeout(() => {
        setVisible(false);
        if (onFinish) onFinish();
      }, duration);
      return () => clearTimeout(timer);
    }
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

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={[styles.alertOverlay, containerStyle]}>
        <View style={styles.alertContainer}>
          <Text style={styles.alertTitle}>{title}</Text>
          <Text style={styles.alertMessage}>{message}</Text>

          {type === "confirm" ? (
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
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
