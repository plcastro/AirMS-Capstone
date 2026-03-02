//Mobile
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Button from "../../components/Button";
import { styles } from "../../stylesheets/styles";
import { API_BASE } from "../../utilities/API_BASE";

export default function ForgotPassword() {
  const nav = useNavigation();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setMessage("Email is required.");
      return false;
    }
    if (!emailRegex.test(email)) {
      setMessage("Invalid email format.");
      return false;
    }
    return true;
  };

  const sendResetLink = async () => {
    if (!validateEmail(email)) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/user/request-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      setLoading(false);

      if (response.ok) {
        setMessage("Password reset email sent. Redirecting to OTP screen...");

        // Redirect to OTP screen with token
        setTimeout(() => nav.replace("otpScreen", { token: data.token }), 2500);
      } else {
        setMessage(
          data.message || "Failed to send reset link. Try again later.",
        );
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      setMessage("Failed to send reset link. Try again later.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.formCard}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={100}
    >
      <View style={styles.formContainer}>
        <Text style={styles.headerText}>Forgot Password</Text>
        <Text style={[styles.subHeaderText, { marginBottom: 20 }]}>
          Please provide your email to proceed
        </Text>

        <TextInput
          style={styles.formInput}
          maxLength={254}
          placeholder="Enter email address"
          placeholderTextColor="gray"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        {message ? (
          <Text
            style={{ color: "red", textAlign: "left", alignSelf: "flex-start" }}
          >
            {message}
          </Text>
        ) : null}

        <Button
          label={loading ? "SENDING..." : "SEND RESET LINK"}
          onPress={sendResetLink}
          disabled={loading}
          buttonStyle={[styles.primaryBtn, { marginTop: 20 }]}
          buttonTextStyle={styles.primaryBtnTxt}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
