import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Button from "../components/Button";
import AlertComp from "../components/AlertComp";
import { styles } from "../stylesheets/styles";

export default function SecuritySetup() {
  const nav = useNavigation();
  const route = useRoute();

  // --- Get token from params (deep link or URL) ---
  const token = route.params?.token || "";

  const [getMessage, setMessage] = useState("");
  const [setupSuccess, setSetupSuccess] = useState(false);

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasUppercase: false,
    hasNumber: false,
  });

  useEffect(() => {
    if (!token) {
      setMessage("Activation token is missing. Please check your link.");
    }
  }, [token]);

  const changeHandler = (key, value) => {
    setFormData({ ...formData, [key]: value });

    if (key === "newPassword") {
      setPasswordRequirements({
        minLength: value.length >= 8,
        hasUppercase: /[A-Z]/.test(value),
        hasNumber: /\d/.test(value),
      });
    }
  };

  const validate = () => {
    const { newPassword, confirmPassword } = formData;

    if (!token) return setMessage("Cannot activate account without a token.");
    if (!newPassword.trim() || !confirmPassword.trim())
      return setMessage("Please fill in all password fields.");
    if (!passwordRequirements.minLength)
      return setMessage("Password must be at least 8 characters.");
    if (!passwordRequirements.hasUppercase)
      return setMessage("Password must contain at least one uppercase letter.");
    if (!passwordRequirements.hasNumber)
      return setMessage("Password must contain at least one number.");
    if (newPassword !== confirmPassword)
      return setMessage("Passwords do not match.");

    handleSetup();
  };

  const handleSetup = () => {
    // TODO: API call with `token` and `formData.newPassword`
    console.log("Activating account with token:", token);
    console.log("New password:", formData.newPassword);

    // Simulate success
    setSetupSuccess(true);
    setMessage("Account activated successfully!");
  };

  const getRequirementStyle = (met) => ({
    color: met ? "#26866F" : "#999",
    fontSize: 12,
  });

  return (
    <KeyboardAvoidingView
      style={styles.formCard}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      enabled
    >
      <View style={styles.formContainer}>
        <Text style={styles.headerText}>Security Setup</Text>
        <Text style={[styles.subHeaderText, { marginBottom: 30 }]}>
          Please set your password to proceed
        </Text>

        {/* New Password */}
        <View style={{ alignItems: "flex-start", width: "100%" }}>
          <Text style={[styles.label, { marginBottom: 5 }]}>New Password</Text>
          <TextInput
            style={styles.formInput}
            maxLength={50}
            placeholder="Enter new password"
            placeholderTextColor="gray"
            autoCapitalize="none"
            secureTextEntry
            value={formData.newPassword}
            onChangeText={(e) => changeHandler("newPassword", e)}
          />

          {/* Password Requirements */}
          <View style={{ marginBottom: 20 }}>
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

          {/* Confirm Password */}
          <Text style={[styles.label, { marginBottom: 5 }]}>
            Confirm Password
          </Text>
          <TextInput
            style={styles.formInput}
            maxLength={50}
            placeholder="Confirm new password"
            placeholderTextColor="gray"
            autoCapitalize="none"
            secureTextEntry
            value={formData.confirmPassword}
            onChangeText={(e) => changeHandler("confirmPassword", e)}
          />
        </View>

        {getMessage && !setupSuccess && (
          <Text style={styles.error}>{getMessage}</Text>
        )}

        {/* Activate Button */}
        <Button
          onPress={validate}
          label="ACTIVATE ACCOUNT"
          buttonStyle={[styles.button, { marginTop: 20 }]}
          buttonTextStyle={styles.buttonText}
        />

        {getMessage && setupSuccess && (
          <AlertComp
            title="Success"
            message={getMessage}
            duration={2500}
            onFinish={() => nav.replace("dashboard")}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
