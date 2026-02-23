import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";

import { styles } from "../../stylesheets/styles";
import Button from "../../components/Button";
import CodeInputField from "../../components/CodeInputField";
import { API_BASE } from "../../utilities/API_BASE";

export default function OTP() {
  const route = useRoute();
  const navigation = useNavigation();
  const token = route.params?.token; // OTP token passed from previous step

  const [code, setCode] = useState("");
  const [pinReady, setPinReady] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const MAX_CODE_LENGTH = 6;

  // Countdown timer for resend button
  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const handleVerify = async () => {
    if (!pinReady) return;

    if (!token) {
      Alert.alert("Error", "Missing verification token.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/user/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          otp: code,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        navigation.navigate("resetPassword", { token });
      } else {
        Alert.alert("Error", data.message || "Invalid OTP");
      }
    } catch (err) {
      console.error("OTP verification error:", err);
      Alert.alert("Error", "Failed to verify OTP. Try again.");
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;

    const email = route.params?.email;
    if (!email) {
      Alert.alert("Error", "Email not available to resend OTP.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/user/request-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok) {
        Alert.alert("Success", "OTP resent to your email.");
        setResendTimer(60);
      } else {
        Alert.alert("Error", data.message || "Failed to resend OTP.");
      }
    } catch (err) {
      console.error("Resend OTP error:", err);
      Alert.alert("Error", "Failed to resend OTP. Try again.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.formCard}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      enabled
    >
      <View style={styles.formContainer}>
        <Text style={styles.headerText}>Account Verification</Text>
        <Text style={styles.subHeaderText}>Enter OTP Code</Text>
        <Text>
          Please enter the 6-digit code sent to{" "}
          {route.params?.email || "your email"}
        </Text>

        <CodeInputField
          code={code}
          setCode={setCode}
          setPinReady={setPinReady}
          maxLength={MAX_CODE_LENGTH}
        />

        <Button
          label="Verify"
          onPress={handleVerify}
          disabled={!pinReady}
          buttonStyle={[
            styles.primaryBtn,
            { minWidth: "100%", marginBottom: 10 },
          ]}
          buttonTextStyle={styles.primaryBtnTxt}
        />

        <Button
          label={
            resendTimer > 0 ? `Resend code (${resendTimer}s)` : "Resend code"
          }
          onPress={handleResend}
          disabled={resendTimer > 0}
          buttonStyle={[styles.secondaryBtn, { minWidth: "100%" }]}
          buttonTextStyle={styles.secondaryBtnTxt}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
