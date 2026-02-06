import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React, { useState } from "react";
import { styles } from "../stylesheets/styles";
import Button from "../components/Button";
export default function ForgotPassword() {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const emailValidation = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage("Invalid email format.");
      return false;
    }

    sendOTPEmail();
    setMessage("");
    return true;
  };
  const sendOTPEmail = async () => {
    try {
      const API_BASE =
        Platform.OS === "android"
          ? "http://10.0.2.2:8000"
          : "http://localhost:8000";

      const response = await fetch(`${API_BASE}/api/user/getAllUsers`);
      const users = await response.json();
      const emailTaken = users.some((user) => user.email === email.trim());
      if (!emailTaken) {
        setMessage("Email not found.");
        return;
      }
      fetch(`${API_BASE}/api/user/request-password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
        .then((response) => {
          if (response.ok) {
            setMessage("Password reset link sent to your email.");
          } else {
            setMessage("Failed to send reset link. Please try again later.");
          }
        })
        .catch((err) => {
          setMessage("Failed to send reset link. Please try again later.");
        });
    } catch (err) {
      setMessage("Failed to send reset link. Please try again later.");
    }
  };
  return (
    <KeyboardAvoidingView
      style={styles.formCard}
      behavior={
        Platform.OS === "android" || Platform.OS === "ios"
          ? "padding"
          : "height"
      }
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
          placeholderTextColor={"gray"}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        {message ? <Text style={{ color: "red" }}>{message}</Text> : null}
        <Button
          buttonStyle={[styles.button, { marginTop: 20 }]}
          buttonTextStyle={styles.buttonText}
          onPress={() => emailValidation(email)}
          label="SEND RESET LINK TO MY EMAIL"
        />
      </View>
    </KeyboardAvoidingView>
  );
}
