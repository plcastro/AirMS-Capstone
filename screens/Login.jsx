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
import CheckBox from "../components/CheckBox";

export default function Login() {
  const nav = useNavigation();
  const [getMessage, setMessage] = useState("");

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const changeHandler = (key, value) => {
    const formattedValue = value;
    setFormData({ ...formData, [key]: formattedValue });
  };
  const validate = () => {
    const { username, password } = formData;
    //validate logic
    if (!username && password) {
      return setMessage("Please enter your username");
    }
    if (username && !password) {
      return setMessage("Please enter your password");
    }
    if (!username && !password) {
      return setMessage("Please enter your username and password");
    }
    login();
  };
  const login = async () => {
    try {
      const API_BASE =
        Platform.OS === "android"
          ? "http://10.0.2.2:8000" // Android emulator uses this to reach localhost
          : "http://localhost:8000";
      const response = await fetch(`${API_BASE}/api/user/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Login successful:", data);
        setMessage("");
        nav.replace("main");
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      console.log("Error logging in:", err);
      setMessage("Something went wrong. Please try again.");
    }
  };

  const goToForgotPassword = () => {
    nav.navigate("forgotPassword");
  };

  return (
    <KeyboardAvoidingView
      style={styles.formCard}
      behavior={Platform.OS === "android" && "ios" ? "padding" : "height"}
      enabled
    >
      <View style={styles.formContainer}>
        <Text style={styles.headerText}>Login</Text>
        <Text style={[styles.subHeaderText, { marginBottom: 20 }]}>
          Please enter your credentials
        </Text>
        <TextInput
          style={styles.formInput}
          maxLength={20}
          placeholder="Username"
          placeholderTextColor={"gray"}
          autoCapitalize="none"
          keyboardType="default"
          value={formData.username}
          onChangeText={(e) => changeHandler("username", e)}
        />
        <TextInput
          style={styles.formInput}
          maxLength={20}
          placeholder="Password"
          secureTextEntry={true}
          placeholderTextColor={"gray"}
          autoCapitalize="none"
          keyboardType="default"
          value={formData.password}
          onChangeText={(e) => changeHandler("password", e)}
        />
        {getMessage ? <Text style={styles.error}>{getMessage}</Text> : null}
        <View style={styles.loginHelper}>
          <CheckBox
            title="Remember me"
            checkboxStyle={styles.checkBox}
            onValueChange={(val) => console.log("Parent got:", val)}
          />

          <View style={styles.forgotPassLink}>
            <Button use={goToForgotPassword} title="Forgot Password?" />
          </View>
        </View>

        <Button
          use={validate}
          title="Login"
          buttonStyle={styles.button}
          buttonTextStyle={styles.buttonText}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
