import React, { useEffect } from "react";
import AppText from "./common/AppText";
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
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
  embedded = false,
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

  const alertContent = (
    <View
      style={[
        styles.alertOverlay,
        embedded ? localStyles.embeddedOverlay : null,
      ]}
    >
      <View style={styles.alertContainer}>
        {title && <AppText style={styles.alertTitle}>{title}</AppText>}
        {message && <AppText style={styles.alertMessage}>{message}</AppText>}

        {(onConfirm || onCancel) && (
          <View style={styles.alertButtonRow}>
            {onCancel && (
              <TouchableOpacity
                style={styles.secondaryAlertBtn}
                onPress={onCancel}
              >
                <AppText style={styles.secondaryAlertBtnTxt}>
                  {cancelText}
                </AppText>
              </TouchableOpacity>
            )}

            {onConfirm && (
              <TouchableOpacity
                style={styles.primaryAlertBtn}
                onPress={onConfirm}
              >
                <AppText style={styles.primaryBtnTxt}>{confirmText}</AppText>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );

  if (embedded) {
    return alertContent;
  }

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onCancel || onConfirm}
    >
      {alertContent}
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  embeddedOverlay: {
    ...StyleSheet.absoluteFillObject,
    elevation: 24,
  },
});
