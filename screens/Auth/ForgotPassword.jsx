import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React, { useState } from "react";
import { styles } from "../../stylesheets/styles";
import Button from "../../components/Button";
import { API_BASE } from "../../utilities/API_BASE";

export default function ForgotPassword() {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const emailValidation = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setMessage("Email is required.");
      return false;
    }
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
      const response = await fetch(`${API_BASE}/api/user/getAllUsers`);
      const result = await response.json();
      const usersArray = result.data;

      const emailExists = usersArray.some(
        (user) => user.email === email.trim(),
      );
      if (!emailExists) {
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
        {message ? (
          <Text
            style={{ color: "red", textAlign: "left", alignSelf: "flex-start" }}
          >
            {message}
          </Text>
        ) : null}
        <Button
          buttonStyle={[styles.button, { marginTop: 20 }]}
          buttonTextStyle={styles.buttonText}
          onPress={() => emailValidation(email)}
          label="SEND RESET LINK"
        />
      </View>
    </KeyboardAvoidingView>
  );
}
