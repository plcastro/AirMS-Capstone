import React, { useEffect } from "react";
import { View, Text, Modal, TouchableOpacity } from "react-native";
import { styles } from "../stylesheets/styles";

export default function AlertComp({
  visible,
  title,
  message,
  duration,
  onFinish,
  onConfirm,
  onCancel,
  confirmText = "OK",
  cancelText = "Cancel",
}) {
  // Auto-close alert (used for success alerts)
  useEffect(() => {
    if (!duration || !visible) return;

    const timer = setTimeout(() => {
      onFinish?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [visible, duration, onFinish]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.alertOverlay}>
        <View style={styles.alertContainer}>
          {title && <Text style={styles.alertTitle}>{title}</Text>}
          {message && <Text style={styles.alertMessage}>{message}</Text>}

          {(onConfirm || onCancel) && (
            <View style={styles.alertButtonRow}>
              {onCancel && (
                <TouchableOpacity
                  style={styles.secondaryAlertBtn}
                  onPress={onCancel}
                >
                  <Text style={styles.secondaryAlertBtnTxt}>{cancelText}</Text>
                </TouchableOpacity>
              )}

              {onConfirm && (
                <TouchableOpacity
                  style={styles.primaryAlertBtn}
                  onPress={onConfirm}
                >
                  <Text style={styles.primaryBtnTxt}>{confirmText}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
