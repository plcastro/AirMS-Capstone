import React, { useState, useEffect } from "react";
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
  const { token } = route.params || {};

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Password requirements
  const passwordRequirements = {
    minLength: formData.newPassword.length >= 8,
    hasUppercase: /[A-Z]/.test(formData.newPassword),
    hasNumber: /\d/.test(formData.newPassword),
  };

  const isFormValid =
    passwordRequirements.minLength &&
    passwordRequirements.hasUppercase &&
    passwordRequirements.hasNumber &&
    formData.confirmPassword &&
    formData.newPassword === formData.confirmPassword;

  const getRequirementStyle = (met) => ({
    color: met ? "#26866F" : "#999",
    fontSize: 12,
    marginRight: 5,
  });

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setError("");
    setSuccessMessage("");
  };

  const validatePasswords = () => {
    if (!formData.newPassword || !formData.confirmPassword) {
      setError("Please fill in all fields.");
      return false;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }
    if (!isFormValid) {
      setError(
        "Password must be at least 8 characters, contain one uppercase letter, and one number.",
      );
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!token) return Alert.alert("Error", "Invalid or missing reset token.");
    if (!validatePasswords()) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/user/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: formData.newPassword }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to reset password.");

      setSuccessMessage("Password reset successfully! Redirecting to login...");
      setTimeout(() => navigation.replace("login"), 3000);
    } catch (err) {
      console.error("Reset password error:", err);
      setError(err.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <View style={styles.formCard}>
        <View style={styles.formContainer}>
          <Text style={styles.headerText}>Invalid Reset Link</Text>
          <Text style={styles.subHeaderText}>
            This password reset link is invalid or has expired.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.formCard}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.formContainer}>
        <Text style={styles.headerText}>Reset Password</Text>
        <Text style={styles.subHeaderText}>Enter your new password</Text>

        <TextInput
          style={styles.formInput}
          placeholder="New Password"
          secureTextEntry
          placeholderTextColor="gray"
          value={formData.newPassword}
          onChangeText={(text) => handleChange("newPassword", text)}
        />

        <TextInput
          style={styles.formInput}
          placeholder="Confirm Password"
          secureTextEntry
          placeholderTextColor="gray"
          value={formData.confirmPassword}
          onChangeText={(text) => handleChange("confirmPassword", text)}
        />

        {/* Password requirements */}
        <View style={{ marginVertical: 10 }}>
          <Text style={{ fontSize: 12, color: "#666", marginBottom: 5 }}>
            Password Requirements:
          </Text>
          <View style={{ flexDirection: "row" }}>
            <Text style={getRequirementStyle(passwordRequirements.minLength)}>
              ✓{" "}
            </Text>
            <Text style={getRequirementStyle(passwordRequirements.minLength)}>
              At least 8 characters
            </Text>
          </View>
          <View style={{ flexDirection: "row" }}>
            <Text
              style={getRequirementStyle(passwordRequirements.hasUppercase)}
            >
              ✓{" "}
            </Text>
            <Text
              style={getRequirementStyle(passwordRequirements.hasUppercase)}
            >
              One uppercase letter
            </Text>
          </View>
          <View style={{ flexDirection: "row" }}>
            <Text style={getRequirementStyle(passwordRequirements.hasNumber)}>
              ✓{" "}
            </Text>
            <Text style={getRequirementStyle(passwordRequirements.hasNumber)}>
              One number
            </Text>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {successMessage ? (
          <Text style={{ color: "green", marginTop: 10 }}>
            {successMessage}
          </Text>
        ) : null}

        <Button
          label={loading ? "RESETTING..." : "RESET PASSWORD"}
          onPress={handleSubmit}
          buttonStyle={[styles.primaryBtn, { marginTop: 20 }]}
          buttonTextStyle={styles.primaryBtnTxt}
          disabled={loading || !isFormValid}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
