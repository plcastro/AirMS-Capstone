//Mobile
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Button from "../../components/Button";
import { styles } from "../../stylesheets/styles";
import { API_BASE } from "../../utilities/API_BASE";

export default function ForgotPassword() {
  const nav = useNavigation();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isEmailValid = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value.trim());
  };

  const isFormValid = isEmailValid(email);

  const sendResetLink = async () => {
    if (!email.trim()) {
      setError("Email is required.");
      setMessage("");
      return;
    }

    if (!isEmailValid(email)) {
      setError("Please enter a valid email address.");
      setMessage("");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE}/api/user/request-password-reset`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      );

      const data = await response.json();
      setLoading(false);

      if (response.ok) {
        setMessage("Password reset email sent. Redirecting to OTP screen...");
        setError("");

        setTimeout(
          () =>
            nav.replace("otpScreen", {
              token: data.token,
              email,
            }),
          2500,
        );
      } else {
        setError(data.message || "Failed to send reset link. Try again later.");
        setMessage("");
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      setError("Failed to send reset link. Try again later.");
      setMessage("");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={100}
    >
      <View style={styles.formCard}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View>
            <Text style={styles.headerText}>Forgot Password</Text>
            <Text style={[styles.subHeaderText, { marginBottom: 20 }]}>
              Please provide your email to proceed
            </Text>

            <Text style={styles.label}>
              Email <Text style={{ color: "red" }}>*</Text>
            </Text>
            <TextInput
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

            <Button
              label={loading ? "SENDING..." : "SEND RESET INSTRUCTIONS"}
              onPress={sendResetLink}
              disabled={!isFormValid || loading}
              buttonStyle={[styles.primaryBtn, { marginTop: 20 }]}
              buttonTextStyle={styles.primaryBtnTxt}
            />

            {error ? (
              <Text
                style={{
                  color: "red",
                  textAlign: "left",
                  alignSelf: "flex-start",
                  marginTop: 10,
                }}
              >
                {error}
              </Text>
            ) : null}

            {message ? (
              <Text
                style={{
                  color: "green",
                  textAlign: "left",
                  alignSelf: "flex-start",
                  marginTop: 10,
                }}
              >
                {message}
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
