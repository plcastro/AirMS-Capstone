import React, { useState, useEffect, useContext } from "react";
import {
  Text,
  KeyboardAvoidingView,
  ScrollView,
  View,
  Pressable,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { secureSetItem } from "../../utilities/secureStorage";

import { styles } from "../../stylesheets/styles";
import Button from "../../components/Button";
import CodeInputField from "../../components/CodeInputField";
import { API_BASE } from "../../utilities/API_BASE";
import LoginLayout from "../../Layout/LoginLayout";
import { showToast } from "../../utilities/toast";
import { AuthContext } from "../../Context/AuthContext";
import {
  readPendingRedirect,
  clearPendingRedirect,
} from "../../utilities/pendingRedirect";

export default function OTP() {
  const route = useRoute();
  const navigation = useNavigation();
  const { loginUser } = useContext(AuthContext);

  const mode = route.params?.mode || "password-reset";
  const [token, setToken] = useState(route.params?.token);
  const [code, setCode] = useState("");
  const [pinReady, setPinReady] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [message, setMessage] = useState("");
  const [trustDevice, setTrustDevice] = useState(true);
  const MAX_CODE_LENGTH = 6;
  const parseResponse = async (res) => {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { message: text || "Unexpected server response" };
    }
  };

  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const handlePasswordResetOtpVerify = async () => {
    if (!pinReady) return;

    if (!token) {
      setMessage("Missing verification token.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/user/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, otp: code }),
      });

      const data = await parseResponse(res);
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

  const handleLoginOtpVerify = async () => {
    if (!pinReady) return;

    if (!token) {
      setMessage("Missing verification token.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/user/login/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-base": route.params?.base || "",
          "x-platform": "MOBILE",
        },
        body: JSON.stringify({
          token,
          otp: code,
          rememberMe: Boolean(route.params?.rememberMe),
          base: route.params?.base,
          client: route.params?.client || "mobile",
          trustDevice,
          trustedDeviceLabel: "mobile-app",
        }),
      });

      const data = await parseResponse(res);
      if (!res.ok) {
        setMessage(data.message || "Invalid OTP");
        return;
      }

      const { user, token: accessToken, refreshToken } = data;
      if (data?.trustedDeviceToken) {
        await secureSetItem(
          "trustedDeviceToken",
          data.trustedDeviceToken,
        );
        await AsyncStorage.setItem(
          "trustedDeviceToken",
          data.trustedDeviceToken,
        );
      }

      await AsyncStorage.setItem("currentUserToken", String(accessToken));

      await AsyncStorage.setItem(
        "rememberMe",
        route.params?.rememberMe ? "true" : "false",
      );

      if (route.params?.rememberMe) {
        await AsyncStorage.setItem(
          "rememberedIdentifier",
          route.params?.identifier || user?.email || "",
        );
        await AsyncStorage.setItem("rememberedBase", route.params?.base || "");
      }

      await loginUser({
        user,
        accessToken,
        refreshToken,
        rememberMe: Boolean(route.params?.rememberMe),
      });

      const pendingRedirect = await readPendingRedirect();
      if (pendingRedirect?.screen) {
        await clearPendingRedirect();
        navigation.replace("dashboard", {
          screen: pendingRedirect.screen,
          params: pendingRedirect.params || {},
        });
        return;
      }

      navigation.replace("dashboard");
    } catch (err) {
      console.error("Login OTP verification error:", err);
      setMessage("Failed to verify OTP. Try again.");
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;

    if (mode !== "login-2fa" && !route.params?.email) {
      setMessage("Email not available to resend OTP.");
      return;
    }

    try {
      const resendEndpoint =
        mode === "login-2fa"
          ? `${API_BASE}/api/user/login/resend-otp`
          : `${API_BASE}/api/user/request-password-reset`;

      const resendPayload =
        mode === "login-2fa" ? { token } : { email: route.params?.email };

      const res = await fetch(resendEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-base": route.params?.base || "",
          "x-platform": "MOBILE",
        },
        body: JSON.stringify(resendPayload),
      });

      const data = await parseResponse(res);
      if (res.ok) {
        if (data.token) {
          setToken(data.token);
        }
        if (data?.verification?.token) {
          setToken(data.verification.token);
        }
        showToast("OTP resent to your email.");
        setResendTimer(60);
      } else {
        setMessage(data.message || "Failed to resend OTP.");
      }
    } catch (err) {
      console.error("Resend OTP error:", err);
      setMessage("Failed to send OTP. Try again later.");
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
          cardTitle={
            mode === "login-2fa" ? "Login Verification" : "Account Verification"
          }
          cardsubTitle={
            "Please enter the 6-digit code sent to " +
            (route.params?.maskedEmail || route.params?.email || "your email")
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
            onPress={
              mode === "login-2fa"
                ? handleLoginOtpVerify
                : handlePasswordResetOtpVerify
            }
            disabled={!pinReady}
            buttonStyle={[
              styles.primaryBtn,
              { minWidth: "100%", marginBottom: 10 },
            ]}
            buttonTextStyle={styles.primaryBtnTxt}
          />
          {mode === "login-2fa" && (
            <View
              style={{
                marginBottom: 10,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ color: "#1f2937", fontWeight: "600" }}>
                Trust this device for 30 days
              </Text>
              <Pressable
                onPress={() => setTrustDevice((prev) => !prev)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: trustDevice }}
                style={{
                  width: 24,
                  height: 24,
                  borderWidth: 2,
                  borderColor: trustDevice ? "#1d4ed8" : "#9ca3af",
                  borderRadius: 4,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: trustDevice ? "#1d4ed8" : "transparent",
                }}
              >
                {trustDevice && (
                  <Text style={{ color: "#ffffff", fontWeight: "700" }}>
                    ✓
                  </Text>
                )}
              </Pressable>
            </View>
          )}

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
