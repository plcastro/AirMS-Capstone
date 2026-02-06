import React, { useState, useEffect } from "react";
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

  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasUppercase: false,
    hasNumber: false,
  });

  // Update password requirement flags when newPassword changes
  useEffect(() => {
    setPasswordRequirements({
      minLength: newPassword.length >= 8,
      hasUppercase: /[A-Z]/.test(newPassword),
      hasNumber: /\d/.test(newPassword),
    });
  }, [newPassword]);

  const validatePasswords = () => {
    setError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    if (!passwordRequirements.minLength) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (!passwordRequirements.hasUppercase) {
      setError("Password must contain at least one uppercase letter.");
      return;
    }

    if (!passwordRequirements.hasNumber) {
      setError("Password must contain at least one number.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    // Call parent submit handler
    onSubmit({
      currentPassword,
      newPassword,
    });

    // Reset fields
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  };

  const getRequirementStyle = (requirementMet) => ({
    color: requirementMet ? "#26866F" : "#999",
    fontSize: 12,
  });

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

          {/* Password requirements display */}
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontSize: 12, color: "#666" }}>
              Password Requirements:
            </Text>
            <Text style={getRequirementStyle(passwordRequirements.minLength)}>
              ✓ At least 8 characters
            </Text>
            <Text
              style={getRequirementStyle(passwordRequirements.hasUppercase)}
            >
              ✓ One uppercase letter
            </Text>
            <Text style={getRequirementStyle(passwordRequirements.hasNumber)}>
              ✓ One number
            </Text>
          </View>

          <TextInput
            style={styles.formInput}
            placeholder="Confirm New Password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholderTextColor="gray"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={{ flexDirection: "row", marginTop: 20, gap: 10 }}>
            <Button
              label="Change password"
              onPress={validatePasswords}
              buttonStyle={styles.alertConfirmBtn}
              buttonTextStyle={styles.alertConfirmBtnText}
            />
            <Button
              label="Cancel"
              onPress={onClose}
              buttonStyle={[styles.alertCancelBtn, { marginRight: 10 }]}
              buttonTextStyle={styles.alertCancelBtnText}
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
          onConfirm={validatePasswords}
          confirmText="Yes, update"
          cancelText="Cancel"
        />
      )}
    </Modal>
  );
}
