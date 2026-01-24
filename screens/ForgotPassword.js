import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React, { useState } from "react";
import { styles } from "../stylesheets/styles";

export default function ForgotPassword() {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const emailValidation = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage("Invalid email format.");
      return false;
    }
    setMessage("");
    return true;
  };
  return (
    <KeyboardAvoidingView
      style={styles.formCard}
      behavior={Platform.OS === "android" && "ios" ? "padding" : "height"}
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
        <TouchableOpacity
          style={[styles.button, { marginTop: 20 }]}
          onPress={() => emailValidation(email)}
        >
          <Text style={styles.buttonText}>SEND RESET LINK TO MY EMAIL</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
