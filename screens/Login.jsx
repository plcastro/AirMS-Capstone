import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { styles } from "../stylesheets/styles";
import React, { useState, useEffect, useContext } from "react";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Button from "../components/Button";
import CheckBox from "../components/CheckBox";
import AlertComp from "../components/AlertComp";
import { AuthContext } from "../Context/AuthContext";

export default function Login() {
  const nav = useNavigation();
  const [getMessage, setMessage] = useState("");
  const [loginSuccess, setLoginSuccess] = useState(false);
  const { setUser } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });

  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const loadSavedCredentials = async () => {
      const savedRememberMe = await AsyncStorage.getItem("rememberMe");
      if (savedRememberMe === "true") {
        const savedIdentifier = await AsyncStorage.getItem(
          "rememberedIdentifier",
        );
        const savedPassword = await AsyncStorage.getItem("rememberedPassword");
        if (savedIdentifier) {
          setFormData({
            identifier: savedIdentifier,
            password: savedPassword || "",
          });
          setRememberMe(true);
        }
      }
    };
    loadSavedCredentials();
  }, []);

  const changeHandler = (key, value) => {
    const formattedValue = value;
    setFormData({ ...formData, [key]: formattedValue });
  };
  const validate = () => {
    const { identifier, password } = formData;

    if (!identifier.trim() && !password.trim()) {
      return setMessage("Please enter your credentials");
    }
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
        body: JSON.stringify({
          identifier: formData.identifier,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Save session
        await AsyncStorage.setItem("currentUser", JSON.stringify(data.user));
        await AsyncStorage.setItem("currentUserToken", data.token);

        // Save or remove Remember Me credentials
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

        setUser(data.user);
        setLoginSuccess(true);
        setMessage("User logged in successfully");
      } else {
        setMessage(data.message || "Login failed");
      }
    } catch (err) {
      console.error("Error logging in:", err);
      setMessage("Something went wrong. Please try again.");
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
          placeholderTextColor={"gray"}
          autoCapitalize="none"
          keyboardType="default"
          value={formData.identifier}
          onChangeText={(e) => changeHandler("identifier", e)}
        />
        <TextInput
          style={styles.formInput}
          maxLength={50}
          placeholder="Password"
          secureTextEntry={true}
          placeholderTextColor={"gray"}
          autoCapitalize="none"
          keyboardType="default"
          value={formData.password}
          onChangeText={(e) => changeHandler("password", e)}
        />
        {getMessage && !loginSuccess ? (
          <Text style={styles.error}>{getMessage}</Text>
        ) : null}
        <View style={styles.loginHelper}>
          <CheckBox
            title="Remember me"
            checkboxStyle={styles.checkBox}
            value={rememberMe}
            onValueChange={(val) => setRememberMe(val)}
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
            duration={2500} // auto-dismiss after 2.5s
            onFinish={() => {
              nav.replace("dashboard");
            }}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
