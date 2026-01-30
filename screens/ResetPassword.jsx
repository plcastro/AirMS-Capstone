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
import Button from "../components/Button";
export default function ResetPassword() {
  const nav = useNavigation();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  const validatePasswords = () => {
    if (newPassword !== confirmPassword) {
      return setMessage("Passwords do not match.");
    }

    setMessage("");
    saveNewPassword();
  };
  const saveNewPassword = () => {
    // Logic to save the new password goes here

    nav.replace("login");
  };

  return (
    <KeyboardAvoidingView
      style={styles.formCard}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={100}
    >
      <View style={styles.formContainer}>
        <Text style={styles.headerText}>Reset Password</Text>
        <Text style={styles.subHeaderText}>Please enter your new password</Text>
        <TextInput
          style={styles.formInput}
          maxLength={20}
          placeholder="New Password"
          secureTextEntry={true}
          placeholderTextColor={"gray"}
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <TextInput
          style={styles.formInput}
          maxLength={20}
          placeholder="Confirm Password"
          secureTextEntry={true}
          placeholderTextColor={"gray"}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        <Text style={styles.error}>{message}</Text>
        <Button
          buttonStyle={[styles.button, { marginTop: 20 }]}
          buttonTextStyle={styles.buttonText}
          use={() => validatePasswords()}
          label={"RESET PASSWORD"}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
