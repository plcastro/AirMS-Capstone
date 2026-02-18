import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { styles } from "../../stylesheets/styles";
import { useNavigation } from "@react-navigation/native";
import Button from "../../components/Button";
import CheckBox from "../../components/CheckBox";
import { AuthContext } from "../../Context/AuthContext";
import { API_BASE } from "../../utilities/API_BASE";

export default function Login() {
  const nav = useNavigation();
  const { loginUser } = useContext(AuthContext);

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
    setFormData({ ...formData, [key]: value.trim() });
  };

  const validate = () => {
    const { identifier, password } = formData;
    if (!identifier.trim() && !password.trim())
      return setMessage("Please enter your username/email and password");
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
        body: JSON.stringify({
          identifier: formData.identifier.trim(),
          password: formData.password.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const { user, token, message } = data;
        if (user.status === "deactivated") {
          setMessage(
            "This account is deactivated. Please contact AirMS Support",
          );
        }

        if (user.status === "inactive") {
          loginUser(user, rememberMe);
          await AsyncStorage.setItem("currentUser", JSON.stringify(user));
          await AsyncStorage.setItem("currentUserToken", token);
          console.log(user.setupToken);
          nav.replace("securitySetup", {
            email: user.email,
            setupToken: rawSetupToken,
          });
          return;
        }

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
        Alert.alert("Logged in successfully");
        loginUser(user, rememberMe);
        setMessage("User logged in successfully");
        setLoginSuccess(true);

        goToDashboard();
      } else {
        console.log("Login error message:", data.message);
        Alert.alert("Login Failed", data.message || "Unauthorized");
        setMessage(data.message || "Login failed");
      }
    } catch (err) {
      console.error(err);
      setMessage("Too many login attempts. Please try again later");
    }
  };

  const goToDashboard = () => {
    setTimeout(() => nav.replace("dashboard"), 2000);
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
          Please enter your username and password
        </Text>
        <TextInput
          style={styles.formInput}
          maxLength={100}
          placeholder="Username/Email"
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
          label="LOGIN"
          buttonStyle={[styles.primaryBtn]}
          buttonTextStyle={styles.primaryBtnTxt}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
