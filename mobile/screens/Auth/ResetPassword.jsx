import React, { useState } from "react";
import AppText from "../../components/common/AppText";
import AppInput from "../../components/common/AppInput";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  TouchableOpacity,
  View
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
  const [redirecting, setRedirecting] = useState(false);

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

      setRedirecting(true);
      setSuccessMessage("Password reset successfully. Taking you to login...");
      setTimeout(() => navigation.replace("login"), 1600);
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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 30,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <LoginLayout
          cardTitle="Reset Password"
          cardsubTitle="Enter your new password"
        >
          {/* PASSWORD FIELDS */}
          <View style={{ marginBottom: 20 }}>
            <AppText style={styles.label}>
              New Password <AppText style={{ color: "red" }}>*</AppText>
            </AppText>
            <AppInput
              style={styles.formInput}
              placeholder="New Password"
              secureTextEntry
              placeholderTextColor="gray"
              value={formData.newPassword}
              onChangeText={(text) => handleChange("newPassword", text)}
            />
          </View>

          <View style={{ marginBottom: 10 }}>
            <AppText style={styles.label}>
              Confirm Password <AppText style={{ color: "red" }}>*</AppText>
            </AppText>
            <AppInput
              style={styles.formInput}
              placeholder="Confirm Password"
              secureTextEntry
              placeholderTextColor="gray"
              value={formData.confirmPassword}
              onChangeText={(text) => handleChange("confirmPassword", text)}
            />
          </View>

          {/* REQUIREMENTS BOX */}
          <View style={{ marginTop: 10, marginBottom: 15 }}>
            <AppText style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
              Password Requirements:
            </AppText>

            <AppText style={getRequirementStyle(passwordRequirements.minLength)}>
              {passwordRequirements.minLength ? "[OK]" : "[ ]"} At least 8
              characters
            </AppText>

            <AppText
              style={getRequirementStyle(passwordRequirements.hasUppercase)}
            >
              {passwordRequirements.hasUppercase ? "[OK]" : "[ ]"} One uppercase
              letter
            </AppText>

            <AppText style={getRequirementStyle(passwordRequirements.hasNumber)}>
              {passwordRequirements.hasNumber ? "[OK]" : "[ ]"} One number
            </AppText>
          </View>

          {/* ERROR / SUCCESS */}
          <View style={{ marginBottom: 10 }}>
            {error ? <AppText style={styles.error}>{error}</AppText> : null}

            {successMessage ? (
              <View
                style={{
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  marginTop: 5,
                }}
              >
                {redirecting ? (
                  <ActivityIndicator color="#26866F" size="small" />
                ) : null}
                <AppText style={{ color: "green", marginLeft: 8 }}>
                  {successMessage}
                </AppText>
              </View>
            ) : null}
          </View>

          {/* BUTTON */}
          <View style={{ marginTop: 10 }}>
            <Button
              label={
                redirecting
                  ? "REDIRECTING..."
                  : loading
                    ? "RESETTING..."
                    : "RESET PASSWORD"
              }
              onPress={handleSubmit}
              buttonStyle={[styles.primaryBtn, { marginTop: 10 }]}
              buttonTextStyle={styles.primaryBtnTxt}
              disabled={loading || redirecting || !isFormValid}
            />
          </View>

          {/* FOOTER LINK */}
          <TouchableOpacity
            onPress={() => navigation.replace("login")}
            activeOpacity={0.8}
            disabled={redirecting}
            style={{ marginTop: 25, alignItems: "center" }}
          >
            <AppText style={{ color: "#374151", textAlign: "center" }}>
              Remember your password?
              <AppText style={{ color: "#059670", fontWeight: "bold" }}>
                {" "}
                Sign In
              </AppText>
            </AppText>
          </TouchableOpacity>
        </LoginLayout>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
