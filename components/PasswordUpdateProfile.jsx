import React, { useState } from "react";
import { View, Text, Modal, TextInput } from "react-native";
import { styles } from "../stylesheets/styles";
import Button from "../components/Button";
import AlertComp from "../components/AlertComp";
export default function PasswordUpdateProfile({ visible, onClose, onSubmit }) {
  const [alertVisible, setAlertVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  const validatePasswords = () => {
    setError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    if (!passwordRegex.test(newPassword)) {
      setError(
        "Password must be at least 8 characters and include 1 uppercase, 1 lowercase, and 1 number.",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    // Pass data to parent (API call happens there)
    onSubmit({
      currentPassword,
      newPassword,
    });

    // Reset fields after submit
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.alertOverlay}>
        <View style={styles.alertContainer}>
          <Text style={styles.headerText}>Change Password</Text>

          <TextInput
            style={styles.formInput}
            placeholder="Current Password"
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholderTextColor="gray"
          />

          <TextInput
            style={styles.formInput}
            placeholder="New Password"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            placeholderTextColor="gray"
          />

          <TextInput
            style={styles.formInput}
            placeholder="Confirm New Password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholderTextColor="gray"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={{ flexDirection: "row", marginTop: 20 }}>
            <Button
              label="CANCEL"
              onPress={onClose}
              buttonStyle={[styles.alertCancelBtn, { marginRight: 10 }]}
              buttonTextStyle={styles.alertCancelBtnText}
            />

            <Button
              label="CHANGE PASSWORD"
              onPress={validatePasswords}
              buttonStyle={styles.alertConfirmBtn}
              buttonTextStyle={styles.alertConfirmBtnText}
            />
          </View>
        </View>
      </View>
      {alertVisible && (
        <AlertComp
          visible={alertVisible}
          onClose={() => setAlertVisible(false)}
          title="Profile Update"
          message="Are you sure you want to update your password?"
          type="confirm"
          onConfirm={handleUpdate}
          confirmText="Yes, update"
          cancelText="Cancel"
        />
      )}
    </Modal>
  );
}
