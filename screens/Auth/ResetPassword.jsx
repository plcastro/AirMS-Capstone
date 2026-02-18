import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { styles } from "../../stylesheets/styles";
import Button from "../../components/Button";
import { API_BASE } from "../../utilities/API_BASE";

export default function ResetPassword() {
  const navigation = useNavigation();
  const route = useRoute();
  const { token } = route.params;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordValid, setPasswordValid] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Password strength check
  useEffect(() => {
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasMinLength = newPassword.length >= 8;
    setPasswordValid(hasUppercase && hasLowercase && hasNumber && hasMinLength);
  }, [newPassword]);

  const validatePasswords = () => {
    if (!newPassword || !confirmPassword) {
      return Alert.alert("Error", "Please fill in all fields.");
    }
    if (newPassword !== confirmPassword) {
      return Alert.alert("Error", "Passwords do not match.");
    }
    if (!passwordValid) {
      return Alert.alert(
        "Error",
        "Password must be at least 8 characters and include uppercase, lowercase, and a number.",
      );
    }
    resetPassword();
  };

  const resetPassword = async () => {
    if (!token) return Alert.alert("Error", "Invalid or missing reset token.");

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/user/reset-password/${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword }),
        },
      );

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to reset password");

      setSuccessMessage(
        "Password changed successfully. Redirecting to login...",
      );

      setTimeout(() => navigation.replace("login"), 3000);
    } catch (error) {
      console.error("Reset password error:", error);
      Alert.alert("Error", error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.formCard}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={100}
    >
      <View style={styles.formContainer}>
        <Text style={styles.headerText}>Reset Password</Text>
        <Text style={styles.subHeaderText}>Enter your new password</Text>

        <TextInput
          style={styles.formInput}
          placeholder="New Password"
          secureTextEntry
          placeholderTextColor="gray"
          value={newPassword}
          onChangeText={setNewPassword}
          maxLength={50}
        />

        <TextInput
          style={styles.formInput}
          placeholder="Confirm Password"
          secureTextEntry
          placeholderTextColor="gray"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          maxLength={50}
        />

        {successMessage ? (
          <Text style={{ marginTop: 10, color: "green" }}>
            {successMessage}
          </Text>
        ) : null}

        <Button
          label={loading ? "RESETTING..." : "CHANGE PASSWORD"}
          onPress={validatePasswords}
          buttonStyle={[styles.primaryBtn, { marginTop: 20 }]}
          buttonTextStyle={styles.primaryBtnTxt}
          disabled={loading || !newPassword || !confirmPassword}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
