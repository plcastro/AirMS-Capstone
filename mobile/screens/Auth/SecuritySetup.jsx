import React, { useState } from "react";
import AppText from "../../components/common/AppText";
import AppInput from "../../components/common/AppInput";
import {
  KeyboardAvoidingView,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Button from "../../components/Button";
import CodeInputField from "../../components/CodeInputField";
import { styles } from "../../stylesheets/styles";
import { API_BASE } from "../../utilities/API_BASE";
import LoginLayout from "../../Layout/LoginLayout";
import { COLORS } from "../../stylesheets/colors";

export default function SecuritySetup() {
  const nav = useNavigation();
  const route = useRoute();

  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const token = route.params?.setupToken || "";
  const [message, setMessage] = useState("");
  const [setupSuccess, setSetupSuccess] = useState(false);
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
    if (!/^\d{6}$/.test(pin))
      return setMessage("PIN must be exactly 6 digits.");
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
        setMessage(
          "Password and PIN set successfully! Redirecting to login...",
        );
        setTimeout(() => nav.replace("login"), 2500);
      } else {
        setMessage(data.message || "Failed to activate account.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Failed to activate account. Please try again later.");
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
      setResendMessage(
        "Failed to resend activation link. Please try again later.",
      );
    } finally {
      setResendLoading(false);
    }
  };

  const getRequirementStyle = (met) => ({
    color: met ? "#26866F" : "#999",
    fontSize: 12,
  });

  const renderPasswordInput = (field, placeholder) => (
    <View style={{ position: "relative", justifyContent: "center" }}>
      <AppInput
        style={[styles.formInput, { paddingRight: 50 }]}
        secureTextEntry={!showPassword}
        placeholder={placeholder}
        placeholderTextColor="gray"
        autoCapitalize="none"
        keyboardType="default"
        value={formData[field]}
        onChangeText={(e) => changeHandler(field, e)}
      />
      <TouchableOpacity
        onPress={() => setShowPassword((current) => !current)}
        accessibilityRole="button"
        accessibilityLabel={showPassword ? "Hide password" : "Show password"}
        style={{
          position: "absolute",
          right: 10,
          height: "100%",
          justifyContent: "center",
          paddingHorizontal: 10,
        }}
      >
        <MaterialCommunityIcons
          name={showPassword ? "eye-off" : "eye"}
          size={21}
          color={COLORS.primaryLight}
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <LoginLayout
          cardTitle="Security Setup"
          cardsubTitle="Set your new password and PIN to proceed"
        >
          <AppText style={styles.label}>New Password *</AppText>
          {renderPasswordInput("newPassword", "Enter new password")}

          <AppText style={styles.label}>Confirm Password *</AppText>
          {renderPasswordInput("confirmPassword", "Confirm new password")}

          <AppText style={{ fontSize: 12, color: "#666", marginBottom: 5 }}>
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

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 14,
            }}
          >
            <AppText style={styles.label}>Set 6-digit PIN *</AppText>
            <TouchableOpacity
              onPress={() => setShowPin((current) => !current)}
              accessibilityRole="button"
              accessibilityLabel={showPin ? "Hide PIN" : "Show PIN"}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingLeft: 12,
                paddingVertical: 4,
              }}
            >
              <MaterialCommunityIcons
                name={showPin ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={COLORS.primaryLight}
              />
              <AppText
                style={{
                  color: COLORS.primaryLight,
                  fontSize: 12,
                  fontWeight: "600",
                  marginLeft: 4,
                }}
              >
                {showPin ? "Hide PIN" : "Show PIN"}
              </AppText>
            </TouchableOpacity>
          </View>
          <CodeInputField
            code={formData.pin}
            setCode={(value) => changeHandler("pin", value)}
            maxLength={6}
            secure={!showPin}
            containerStyle={{
              flex: 0,
              alignItems: "stretch",
              marginVertical: 0,
              marginBottom: 16,
              width: "100%",
            }}
            inputContainerStyle={{ width: "100%" }}
          />

          <AppText style={styles.label}>Confirm PIN *</AppText>
          <CodeInputField
            code={formData.confirmPin}
            setCode={(value) => changeHandler("confirmPin", value)}
            maxLength={6}
            secure={!showPin}
            containerStyle={{
              flex: 0,
              alignItems: "stretch",
              marginVertical: 0,
              marginBottom: 16,
              width: "100%",
            }}
            inputContainerStyle={{ width: "100%" }}
          />

          {message && !setupSuccess && (
            <AppText style={styles.error}>{message}</AppText>
          )}

          <Button
            onPress={validate}
            label="SET PASSWORD & PIN"
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
              <AppText style={{ fontSize: 12, color: "#8f8e8e", marginTop: 5 }}>
                {resendMessage}
              </AppText>
            )}
          </View>
        </LoginLayout>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
