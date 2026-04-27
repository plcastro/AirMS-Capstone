import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Button from "../../components/Button";
import CodeInputField from "../../components/CodeInputField";
import { styles } from "../../stylesheets/styles";
import { API_BASE } from "../../utilities/API_BASE";

export default function SecuritySetup() {
  const nav = useNavigation();
  const route = useRoute();

  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const email = route.params?.email || "";
  const token = route.params?.setupToken || "";
  const [message, setMessage] = useState("");
  const [setupSuccess, setSetupSuccess] = useState(false);
  console.log(token);
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
    pin: "",
    confirmPin: "",
  });
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasUppercase: false,
    hasNumber: false,
  });
  // inside SecuritySetup component
  const isFormValid =
    passwordRequirements.minLength &&
    passwordRequirements.hasUppercase &&
    passwordRequirements.hasNumber &&
    formData.confirmPassword &&
    formData.newPassword === formData.confirmPassword &&
    /^\d{6}$/.test(formData.pin) &&
    formData.pin === formData.confirmPin;

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
    const { newPassword, confirmPassword, pin, confirmPin } = formData;
    if (!newPassword.trim() || !confirmPassword.trim() || !pin || !confirmPin)
      return setMessage("Please fill all fields.");
    if (!passwordRequirements.minLength)
      return setMessage("Password must be at least 8 characters.");
    if (!passwordRequirements.hasUppercase)
      return setMessage("Password must contain an uppercase letter.");
    if (!passwordRequirements.hasNumber)
      return setMessage("Password must contain a number.");
    if (newPassword !== confirmPassword)
      return setMessage("Passwords do not match.");
    if (!/^\d{6}$/.test(pin)) return setMessage("PIN must be exactly 6 digits.");
    if (pin !== confirmPin) return setMessage("PINs do not match.");

    handleSetup();
  };

  const handleSetup = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/user/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword: formData.newPassword,
          pin: formData.pin,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setSetupSuccess(true);
        setMessage("Password and PIN set successfully! Redirecting to login...");
        setTimeout(() => nav.replace("login"), 2500);
      } else {
        setMessage(data.message || "Failed to activate account.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Failed to activate account. Try again later.");
    }
  };

  const handleResendActivation = async () => {
    if (!route.params?.email) return;

    setResendLoading(true);
    setResendMessage("");

    try {
      const res = await fetch(`${API_BASE}/api/user/resend-activation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: route.params.email }),
      });
      const data = await res.json();

      if (res.ok) {
        setResendMessage(data.message || "Activation link sent!");
      } else {
        setResendMessage(data.message || "Failed to resend activation link.");
      }
    } catch (err) {
      console.error(err);
      setResendMessage("Failed to resend activation link. Try again later.");
    } finally {
      setResendLoading(false);
    }
  };

  const getRequirementStyle = (met) => ({
    color: met ? "#26866F" : "#999",
    fontSize: 12,
  });

  return (
    <KeyboardAvoidingView
      style={[styles.formCard, { minHeight: "80%" }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      enabled
    >
      <View style={styles.formContainer}>
        <Text style={styles.headerText}>Security Setup</Text>
        <Text style={[styles.subHeaderText, { marginBottom: 30 }]}>
          Set your new password and PIN to proceed
        </Text>
        <View style={{ alignItems: "flex-start", width: "100%" }}>
          <Text style={styles.label}>New Password</Text>
          <TextInput
            style={styles.formInput}
            secureTextEntry
            placeholder="Enter new password"
            placeholderTextColor={"gray"}
            autoCapitalize="none"
            value={formData.newPassword}
            onChangeText={(e) => changeHandler("newPassword", e)}
          />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.formInput}
            secureTextEntry
            placeholder="Confirm new password"
            placeholderTextColor={"gray"}
            autoCapitalize="none"
            value={formData.confirmPassword}
            onChangeText={(e) => changeHandler("confirmPassword", e)}
          />

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

          <Text style={styles.label}>Set 6-digit PIN</Text>
          <CodeInputField
            code={formData.pin}
            setCode={(value) => changeHandler("pin", value)}
            maxLength={6}
            secure
            containerStyle={{ flex: 0, alignItems: "stretch", marginVertical: 0, marginBottom: 16, width: "100%" }}
            inputContainerStyle={{ width: "100%" }}
          />

          <Text style={styles.label}>Confirm PIN</Text>
          <CodeInputField
            code={formData.confirmPin}
            setCode={(value) => changeHandler("confirmPin", value)}
            maxLength={6}
            secure
            containerStyle={{ flex: 0, alignItems: "stretch", marginVertical: 0, marginBottom: 16, width: "100%" }}
            inputContainerStyle={{ width: "100%" }}
          />

          {message && !setupSuccess && (
            <Text style={styles.error}>{message}</Text>
          )}

          <Button
            onPress={validate}
            label="SET PASSWORD"
            buttonStyle={[styles.primaryBtn, { marginTop: 20 }]}
            buttonTextStyle={styles.primaryBtnTxt}
            disabled={!isFormValid}
          />

          <View style={{ marginTop: 15 }}>
            <Button
              label={resendLoading ? "SENDING..." : "RESEND ACTIVATION LINK"}
              onPress={handleResendActivation}
              disabled={resendLoading}
              buttonStyle={[
                styles.secondaryBtn,
                {
                  maxWidth: 500,
                  minWidth: "100%",
                },
              ]}
              buttonTextStyle={[styles.secondaryBtnTxt]}
            />
            {resendMessage && (
              <Text style={{ fontSize: 12, color: "#8f8e8e", marginTop: 5 }}>
                {resendMessage}
              </Text>
            )}
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
