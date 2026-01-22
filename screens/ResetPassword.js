import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { styles } from "../stylesheets/styles";
import React, { useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
export default function ResetPassword() {
  const navigation = useNavigation();
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

    navigation.replace("login");
  };

  return (
    <View style={styles.formCard}>
      <View style={styles.formContainer}>
        <Text style={styles.headerText}>Reset Password</Text>
        <Text style={styles.subHeaderText}>Please enter your new password</Text>
        <TextInput
          style={styles.formInput}
          maxLength={20}
          placeholder="New Password"
          secureTextEntry={true}
          placeholderTextColor={"gray"}
        />
        <TextInput
          style={styles.formInput}
          maxLength={20}
          placeholder="Confirm Password"
          secureTextEntry={true}
          placeholderTextColor={"gray"}
        />
        {message ? <Text style={{ color: "red" }}>{message}</Text> : null}
        <TouchableOpacity
          style={[styles.button, { marginTop: 20 }]}
          onPress={() => validatePasswords()}
        >
          <Text style={styles.buttonText}>RESET PASSWORD</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
