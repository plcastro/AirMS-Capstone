import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { styles } from "../stylesheets/styles";
import { useNavigation } from "@react-navigation/native";
import Button from "../components/Button";
import CheckBox from "../components/CheckBox";
import AlertComp from "../components/AlertComp";
import { AuthContext } from "../Context/AuthContext";
import { API_BASE } from "../utilities/API_BASE";

export default function Login() {
  const nav = useNavigation();
  const { loginUser } = useContext(AuthContext);
  const [pendingUser, setPendingUser] = useState(null);

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
        console.error(err);
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
      const response = await fetch(`${API_BASE}/api/user/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      const { user, token, message } = data;

      if (response.ok) {
        // --- Check status before login ---
        if (user.status === "inactive") {
          // Save user in context but do NOT redirect to dashboard
          loginUser(user, rememberMe); // context still knows the user
          await AsyncStorage.setItem("currentUser", JSON.stringify(user));
          await AsyncStorage.setItem("currentUserToken", token);

          // Optionally navigate to SecuritySetup
          nav.replace("securitySetup");
          return;
        }

        // Only active users proceed to dashboard
        await AsyncStorage.setItem("currentUserToken", token);
        await AsyncStorage.setItem("currentUser", JSON.stringify(user));

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
        setPendingUser(user);
        setMessage("User logged in successfully");
        setLoginSuccess(true);
      } else {
        setMessage(message || "Login failed");
      }
    } catch (err) {
      console.error(err);
      setMessage("Too many login attempts. Please try again later");
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
          maxLength={100}
          placeholder="Username or Email"
          placeholderTextColor="gray"
          autoCapitalize="none"
          keyboardType="default"
          value={formData.identifier}
          onChangeText={(text) => changeHandler("identifier", text)}
        />
        <TextInput
          style={styles.formInput}
          maxLength={100}
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
            value={rememberMe} // controlled value
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
        {loginSuccess && (
          <AlertComp
            title="Success"
            visible={loginSuccess}
            message={getMessage}
            duration={1500}
            onFinish={() => {
              loginUser(pendingUser, rememberMe);
              nav.replace("dashboard");
            }}
            containerStyle={{ alignContent: "center" }}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
