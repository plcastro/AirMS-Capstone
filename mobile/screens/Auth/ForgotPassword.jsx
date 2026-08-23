//Mobile
import React, { useState } from "react";
import AppText from "../../components/common/AppText";
import AppInput from "../../components/common/AppInput";
import {
  KeyboardAvoidingView,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Button from "../../components/Button";
import { styles } from "../../stylesheets/styles";
import { API_BASE } from "../../utilities/API_BASE";
import { useRoute } from "@react-navigation/native";
import LoginLayout from "../../Layout/LoginLayout";
import { showToast } from "../../utilities/toast";
export default function ForgotPassword() {
  const nav = useNavigation();
  const route = useRoute();
  const [email, setEmail] = useState(route.params?.email || "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isEmailValid = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value.trim());
  };

  const sendResetLink = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Email is required.");
      setMessage("");
      return;
    }

    if (!isEmailValid(normalizedEmail)) {
      setError("Please enter a valid email address.");
      setMessage("");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_BASE}/api/user/request-password-reset`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        showToast("Password reset email sent. Redirecting to OTP screen...");
        setError("");

        setTimeout(
          () =>
            nav.replace("otpScreen", {
              token: data.token,
              email: normalizedEmail,
            }),
          2500,
        );
      } else {
        setError(
          response.status === 404
            ? "Email entered does not correspond to any account. Please contact AirMS support."
            : data.message || "Failed to send reset link. Try again later.",
        );
        setMessage("");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to send reset link. Try again later.");
      setMessage("");
    } finally {
      setLoading(false);
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
          cardTitle="Forgot Password"
          cardsubTitle="Please provide your email to proceed"
        >
          <AppText style={styles.label}>
            Email <AppText style={{ color: "red" }}>*</AppText>
          </AppText>
          <AppInput
            style={[styles.formInput, { marginBottom: 0 }]}
            maxLength={254}
            placeholder="Enter email address"
            placeholderTextColor="gray"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError("");
              setMessage("");
            }}
          />
          {error ? (
            <AppText
              style={{
                color: "red",
                textAlign: "left",
                alignSelf: "flex-start",
                marginTop: 10,
              }}
            >
              {error}
            </AppText>
          ) : null}
          <Button
            label={loading ? "SENDING..." : "CONTINUE"}
            onPress={sendResetLink}
            disabled={loading}
            buttonStyle={[styles.primaryBtn, { marginTop: 20 }]}
            buttonTextStyle={styles.primaryBtnTxt}
          />
          <TouchableOpacity
            onPress={() => nav.replace("login")}
            activeOpacity={0.8}
          >
            <AppText
              style={{
                marginTop: 20,
                color: "#374151",
              }}
            >
              Remember your password?
              <AppText
                style={{
                  color: "#059670",
                  fontWeight: "bold",
                }}
              >
                {" "}
                Log in
              </AppText>
            </AppText>
          </TouchableOpacity>

          {message ? (
            <AppText
              style={{
                color: "green",
                textAlign: "left",
                alignSelf: "flex-start",
                marginTop: 10,
              }}
            >
              {message}
            </AppText>
          ) : null}
        </LoginLayout>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
