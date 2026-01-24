import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { styles } from "../stylesheets/styles";
import React, { useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ResetPassword() {
  const nav = useNavigation();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  const validatePasswords = () => {
    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      return false;
    }
    setMessage("");
    saveNewPassword();
    return true;
  };
  const saveNewPassword = () => {
    // Logic to save the new password goes here

    nav.replace("login");
  };

  return (
    <KeyboardAvoidingView
      style={styles.formCard}
      behavior={Platform.OS === "android" && "ios" ? "padding" : "height"}
      keyboardVerticalOffset={100}
    >
      <View style={styles.formContainer}>
        <Text style={styles.headerText}>Reset Password</Text>
        <Text style={styles.subHeaderText}>Please enter your new password</Text>
        <TextInput
          style={styles.formInput}
          maxLength={20}
          placeholder="New Password"
          secureTextEntry
          placeholderTextColor={"gray"}
        />
        <TextInput
          style={styles.formInput}
          maxLength={20}
          placeholder="Confirm Password"
          secureTextEntry
          placeholderTextColor={"gray"}
        />
        <Text style={styles.error}>{message}</Text>
        <TouchableOpacity
          style={[styles.button, { marginTop: 20 }]}
          onPress={() => validatePasswords()}
        >
          <Text style={styles.buttonText}>RESET PASSWORD</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
