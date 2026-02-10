import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { styles } from "../../stylesheets/styles";
import React, { useState } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import Button from "../../components/Button";
import { API_BASE } from "../../utilities/API_BASE";

export default function ResetPassword() {
  const nav = useNavigation();
  const route = useRoute();
  const token = route.params?.token;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const validatePasswords = () => {
    if (!newPassword || !confirmPassword) {
      return setMessage("Please fill in all fields.");
    }

    if (newPassword !== confirmPassword) {
      return setMessage("Passwords do not match.");
    }

    setMessage("");
    saveNewPassword();
  };

  const saveNewPassword = async () => {
    if (!token) return setMessage("Invalid or missing reset token.");

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/user/reset-password/${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword, otp }),
        },
      );

      const data = await response.json();

      if (!response.ok)
        throw new Error(data.message || "Failed to reset password");

      setMessage("Password reset successfully. Redirecting to login…");

      setTimeout(() => nav.replace("login"), 3000);
    } catch (err) {
      console.error("Reset password error:", err);
      setMessage(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.formCard}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={100}
    >
      <View style={styles.formContainer}>
        <Text style={styles.headerText}>Reset Password</Text>
        <TextInput
          style={styles.formInput}
          placeholder="Enter OTP from Email"
          value={otp}
          onChangeText={setOtp}
          keyboardType="numeric"
        />
        <Text style={styles.subHeaderText}>Please enter your new password</Text>

        <TextInput
          style={styles.formInput}
          maxLength={50}
          placeholder="New Password"
          secureTextEntry
          placeholderTextColor="gray"
          value={newPassword}
          onChangeText={setNewPassword}
        />

        <TextInput
          style={styles.formInput}
          maxLength={50}
          placeholder="Confirm Password"
          secureTextEntry
          placeholderTextColor="gray"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        {message ? <Text style={styles.error}>{message}</Text> : null}

        <Button
          buttonStyle={[styles.button, { marginTop: 20 }]}
          buttonTextStyle={styles.buttonText}
          onPress={validatePasswords}
          label={loading ? "RESETTING..." : "RESET PASSWORD"}
          disabled={loading}
        />
        <Button
          buttonStyle={[styles.button, { marginTop: 20 }]}
          buttonTextStyle={styles.buttonText}
          onPress={() => {
            nav.replace("login");
          }}
          label="GO TO LOGIN"
        />
      </View>
    </KeyboardAvoidingView>
  );
}
