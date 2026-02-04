import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { styles } from "../stylesheets/styles";
import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import Button from "../components/Button";
import AlertComp from "../components/AlertComp";

export default function SecuritySetup() {
  const nav = useNavigation();
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

  const changeHandler = (key, value) => {
    setFormData({ ...formData, [key]: value });

    // Check password requirements when newPassword changes
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

    if (!newPassword.trim() && !confirmPassword.trim()) {
      return setMessage("Please enter your new password");
    }
    if (!newPassword.trim())
      return setMessage("Please enter your new password");
    if (!confirmPassword.trim())
      return setMessage("Please confirm your password");

    // Check password requirements
    if (!passwordRequirements.minLength) {
      return setMessage("Password must be at least 8 characters");
    }
    if (!passwordRequirements.hasUppercase) {
      return setMessage("Password must contain at least one uppercase letter");
    }
    if (!passwordRequirements.hasNumber) {
      return setMessage("Password must contain at least one number");
    }

    if (newPassword !== confirmPassword) {
      return setMessage("Passwords do not match");
    }

    // If all validations pass
    handleSetup();
  };

  const handleSetup = () => {
    // 🚧 DATABASE / API LINKING SHOULD BE DONE HERE 🚧
    console.log("Setting up security with password:", formData.newPassword);

    // Simulate API call success
    setSetupSuccess(true);
    setMessage("Account activated successfully!");
  };

  const getRequirementStyle = (requirementMet) => ({
    color: requirementMet ? "#26866F" : "#999",
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

        {/* New Password Input */}
        <Text
          style={[styles.label, { alignSelf: "flex-start", marginBottom: 5 }]}
        >
          New Password
        </Text>
        <TextInput
          style={styles.formInput}
          maxLength={50}
          placeholder="Enter new password"
          placeholderTextColor={"gray"}
          autoCapitalize="none"
          keyboardType="default"
          secureTextEntry={true}
          value={formData.newPassword}
          onChangeText={(e) => changeHandler("newPassword", e)}
        />

        {/* Password Requirements */}
        <View style={{ alignSelf: "flex-start", marginBottom: 20 }}>
          <Text style={{ fontSize: 12, color: "#666", marginBottom: 5 }}>
            Password Requirements:
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 2,
            }}
          >
            <Text style={getRequirementStyle(passwordRequirements.minLength)}>
              ✓{" "}
            </Text>
            <Text style={getRequirementStyle(passwordRequirements.minLength)}>
              At least 8 characters
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 2,
            }}
          >
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
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={getRequirementStyle(passwordRequirements.hasNumber)}>
              ✓{" "}
            </Text>
            <Text style={getRequirementStyle(passwordRequirements.hasNumber)}>
              One number
            </Text>
          </View>
        </View>

        {/* Confirm Password Input */}
        <Text
          style={[styles.label, { alignSelf: "flex-start", marginBottom: 5 }]}
        >
          Confirm Password
        </Text>
        <TextInput
          style={styles.formInput}
          maxLength={50}
          placeholder="Confirm new password"
          placeholderTextColor={"gray"}
          autoCapitalize="none"
          keyboardType="default"
          secureTextEntry={true}
          value={formData.confirmPassword}
          onChangeText={(e) => changeHandler("confirmPassword", e)}
        />

        {getMessage && !setupSuccess ? (
          <Text style={styles.error}>{getMessage}</Text>
        ) : null}

        {/* Activate Account Button */}
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
            onFinish={() => {
              // Navigate to dashboard or next screen after success
              nav.replace("dashboard");
            }}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
