import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { styles } from "../stylesheets/styles";
import { useNavigation } from "@react-navigation/native";
import Button from "../components/Button";
import CheckBox from "../components/CheckBox";
import AlertComp from "../components/AlertComp";
import { AuthContext } from "../Context/AuthContext";

export default function Login() {
  const nav = useNavigation();
  const { setUser } = useContext(AuthContext);

  const [formData, setFormData] = useState({ identifier: "", password: "" });
  const [rememberMe, setRememberMe] = useState(false);
  const [getMessage, setMessage] = useState("");
  const [loginSuccess, setLoginSuccess] = useState(false);

  // Load saved credentials on mount
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const savedRememberMe = await AsyncStorage.getItem("rememberMe");
        if (savedRememberMe === "true") {
          const savedIdentifier = await AsyncStorage.getItem(
            "rememberedIdentifier",
          );
          const savedPassword =
            await AsyncStorage.getItem("rememberedPassword");
          setFormData({
            identifier: savedIdentifier || "",
            password: savedPassword || "",
          });
          setRememberMe(true);
        }
      } catch (err) {
        console.error("Failed to load saved credentials:", err);
      }
    };

    loadSavedCredentials();
  }, []);

  const changeHandler = (key, value) => {
    setFormData({ ...formData, [key]: value });
  };

  const validate = () => {
    const { identifier, password } = formData;
    if (!identifier.trim() && !password.trim())
      return setMessage("Please enter your credentials");
    if (!identifier.trim())
      return setMessage("Please enter your username or email");
    if (!password.trim()) return setMessage("Please enter your password");

    login();
  };

  const login = async () => {
    try {
      const API_BASE =
        Platform.OS === "android"
          ? "http://10.0.2.2:8000"
          : "http://localhost:8000";

      const response = await fetch(`${API_BASE}/api/user/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      const { user, token, message } = data;
      if (response.ok) {
        setUser(user);
        setLoginSuccess(true);
        setMessage("User logged in successfully");

        await AsyncStorage.setItem("currentUser", JSON.stringify(user));
        await AsyncStorage.setItem("currentUserToken", token);

        // Save/remove remembered credentials
        if (rememberMe) {
          await AsyncStorage.setItem("rememberMe", "true");
          await AsyncStorage.setItem(
            "rememberedIdentifier",
            formData.identifier.trim(),
          );
          await AsyncStorage.setItem(
            "rememberedPassword",
            formData.password.trim(),
          );
        } else {
          await AsyncStorage.setItem("rememberMe", "false");
          await AsyncStorage.removeItem("rememberedIdentifier");
          await AsyncStorage.removeItem("rememberedPassword");
        }
      } else {
        setMessage(message || "Login failed");
      }
    } catch (err) {
      console.error(err);
      setMessage("Something went wrong");
    }
  };

  const goToForgotPassword = () => nav.navigate("forgotPassword");

  return (
    <KeyboardAvoidingView
      style={styles.formCard}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      enabled
    >
      <View style={styles.formContainer}>
        <Text style={styles.headerText}>Login</Text>
        <Text style={[styles.subHeaderText, { marginBottom: 20 }]}>
          Please enter your credentials
        </Text>
        <TextInput
          style={styles.formInput}
          maxLength={50}
          placeholder="Username or Email"
          placeholderTextColor="gray"
          autoCapitalize="none"
          keyboardType="default"
          value={formData.identifier}
          onChangeText={(text) => changeHandler("identifier", text)}
        />
        <TextInput
          style={styles.formInput}
          maxLength={50}
          placeholder="Password"
          placeholderTextColor="gray"
          autoCapitalize="none"
          secureTextEntry
          keyboardType="default"
          value={formData.password}
          onChangeText={(text) => changeHandler("password", text)}
        />
        {getMessage && !loginSuccess && (
          <Text style={styles.error}>{getMessage}</Text>
        )}
        <View style={styles.loginHelper}>
          <CheckBox
            title="Remember me"
            checkboxStyle={styles.checkBox}
            value={rememberMe}
            onValueChange={setRememberMe}
          />

          <View style={styles.forgotPassLink}>
            <Button
              onPress={goToForgotPassword}
              label="Forgot Password?"
              buttonTextStyle={{ color: "#555555" }}
            />
          </View>
        </View>
        <Button
          onPress={validate}
          label="Login"
          buttonStyle={styles.button}
          buttonTextStyle={styles.buttonText}
        />
        {getMessage && loginSuccess && (
          <AlertComp
            title="Success"
            message={getMessage}
            duration={1500}
            onFinish={() => nav.replace("dashboard")}
            containerStyle={{ alignContent: "center" }}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
