import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { styles } from "../../stylesheets/styles";

export default function ApproveMaintenance({
  visible,
  aircraftNumber = "",
  onConfirm,
  onCancel,
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleApprove = () => {
    onConfirm?.(username, password);
    resetForm();
  };

  const handleCancel = () => {
    resetForm();
    onCancel?.();
  };

  const resetForm = () => {
    setUsername("");
    setPassword("");
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.alertOverlay}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        >
          <View style={styles.verificationAlertContainer}>
            <Text style={styles.verificationAlertTitle}>
              Verification Required
            </Text>

            <Text style={styles.verificationAlertMessage}>
              You confirm you have performed the maintenance history check of
              aircraft {aircraftNumber}
            </Text>

            {/* Username Field */}
            <View style={styles.verificationField}>
              <Text style={styles.verificationLabel}>Username</Text>
              <TextInput
                style={styles.verificationInput}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter your username"
                autoCapitalize="none"
              />
            </View>

            {/* Password Field */}
            <View style={styles.verificationField}>
              <Text style={styles.verificationLabel}>Password</Text>
              <TextInput
                style={styles.verificationInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {/* Buttons */}
            <View style={styles.verificationButtonRow}>
              <TouchableOpacity
                style={styles.verificationApproveBtn}
                onPress={handleApprove}
              >
                <Text style={styles.verificationBtnText}>APPROVE</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.verificationCancelBtn}
                onPress={handleCancel}
              >
                <Text style={styles.verificationBtnText}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
