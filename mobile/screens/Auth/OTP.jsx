import React, { useState, useEffect } from "react";
import { Text, KeyboardAvoidingView, ScrollView } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";

import { styles } from "../../stylesheets/styles";
import Button from "../../components/Button";
import CodeInputField from "../../components/CodeInputField";
import { API_BASE } from "../../utilities/API_BASE";
import LoginLayout from "../../Layout/LoginLayout";
import { showToast } from "../../utilities/toast";

export default function OTP() {
  const route = useRoute();
  const navigation = useNavigation();
  const [token, setToken] = useState(route.params?.token);

  const [code, setCode] = useState("");
  const [pinReady, setPinReady] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [message, setMessage] = useState("");
  const MAX_CODE_LENGTH = 6;

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
      setMessage("Missing verification token.");
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
        setMessage(data.message || "Invalid OTP");
      }
    } catch (err) {
      console.error("OTP verification error:", err);
      setMessage("Failed to verify OTP. Try again.");
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;

    const email = route.params?.email;
    if (!email) {
      setMessage("Email not available to resend OTP.");
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
        if (data.token) {
          setToken(data.token);
        }
        showToast("OTP resent to your email.");
        setResendTimer(60);
      } else {
        setMessage(data.message || "Failed to resend OTP.");
      }
    } catch (err) {
      console.error("Resend OTP error:", err);
      setMessage("Failed to send reset link. Try again later.");
      showToast("Failed to resend OTP.");
    }
  };

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
          cardTitle="Account Verification"
          cardsubTitle={
            "Please enter the 6-digit code sent to " +
            (route.params?.email || "your email")
          }
        >
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
          <Text style={{ color: "red", marginTop: 10, textAlign: "left" }}>
            {pinReady ? message : ""}
          </Text>
        </LoginLayout>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
