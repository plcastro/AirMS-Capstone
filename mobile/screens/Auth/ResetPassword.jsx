import React, { useState } from "react";
import {
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { styles } from "../../stylesheets/styles";
import Button from "../../components/Button";
import { API_BASE } from "../../utilities/API_BASE";
import LoginLayout from "../../Layout/LoginLayout";

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
    if (!token) return setError("Invalid or missing reset token.");
    if (!validatePasswords()) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/user/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword: formData.newPassword,
        }),
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
      <LoginLayout
        cardTitle="Invalid Reset Link"
        cardsubTitle="This password reset link is invalid or has expired."
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LoginLayout
          cardTitle="Reset Password"
          cardsubTitle="Enter your new password"
        >
          <Text style={styles.label}>
            New Password <Text style={{ color: "red" }}>*</Text>
          </Text>
          <TextInput
            style={styles.formInput}
            placeholder="New Password"
            secureTextEntry
            placeholderTextColor="gray"
            value={formData.newPassword}
            onChangeText={(text) => handleChange("newPassword", text)}
          />

          <Text style={styles.label}>
            Confirm Password <Text style={{ color: "red" }}>*</Text>
          </Text>
          <TextInput
            style={styles.formInput}
            placeholder="Confirm Password"
            secureTextEntry
            placeholderTextColor="gray"
            value={formData.confirmPassword}
            onChangeText={(text) => handleChange("confirmPassword", text)}
          />

          <Text style={{ fontSize: 12, color: "#666", marginBottom: 5 }}>
            Password Requirements:
          </Text>
          <Text style={getRequirementStyle(passwordRequirements.minLength)}>
            {passwordRequirements.minLength ? "[OK]" : "[ ]"} At least 8
            characters
          </Text>
          <Text style={getRequirementStyle(passwordRequirements.hasUppercase)}>
            {passwordRequirements.hasUppercase ? "[OK]" : "[ ]"} One uppercase
            letter
          </Text>
          <Text style={getRequirementStyle(passwordRequirements.hasNumber)}>
            {passwordRequirements.hasNumber ? "[OK]" : "[ ]"} One number
          </Text>

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
          <Text style={{ marginTop: 20 }}>
            Remember your password?
            <TouchableOpacity onPress={() => nav.replace("login")}>
              <Text style={{ color: "#059670" }}> Sign In</Text>
            </TouchableOpacity>
          </Text>
        </LoginLayout>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
