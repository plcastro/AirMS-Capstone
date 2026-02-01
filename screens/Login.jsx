import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { styles } from "../stylesheets/styles";
import React, { useState, useEffect, useContext } from "react";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
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
    const loadSaved = async () => {
      const savedRememberMe = await AsyncStorage.getItem("rememberMe");

      if (savedRememberMe === "true") {
        const savedIdentifier = await AsyncStorage.getItem(
          "rememberedIdentifier",
        );

        const savedPassword = await AsyncStorage.getItem("rememberedPassword");

        if (savedIdentifier) {
          setFormData({
            identifier: savedIdentifier || "",
            password: savedPassword || "",
          });
          setRememberMe(true);
        }
      }
    };

    loadSaved();
  }, []);

  const handleRememberMeChange = (e) => {
    if (!isChecked) {
      AsyncStorage.setItem("rememberMe", "false"); // triggers other tabs
      AsyncStorage.removeItem("rememberedIdentifier");
      AsyncStorage.removeItem("rememberedPassword");
    } else {
      AsyncStorage.setItem("rememberMe", "true");
    }
  };

  const changeHandler = (key, value) => {
    const formattedValue = value;
    setFormData({ ...formData, [key]: formattedValue });
  };
  const validate = () => {
    const { identifier, password } = formData;
    //validate logic
    if (!identifier.trim() && !password.trim()) {
      return setMessage("Please enter your credentials");
    }
    if (!identifier.trim()) {
      return setMessage("Please enter your username or email");
    }
    if (!password.trim()) {
      return setMessage("Please enter your password");
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
          identifier: formData.identifier,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        AsyncStorage.setItem("currentUser", JSON.stringify(data.user));

        // Handle Remember Me functionality
        if (rememberMe) {
          AsyncStorage.setItem(
            "rememberedIdentifier",
            formData.identifier.trim(),
          );
          AsyncStorage.setItem("rememberedPassword", formData.password.trim());
          AsyncStorage.setItem("rememberMe", "true");
        } else {
          // Clear saved credentials if Remember Me is not checked
          AsyncStorage.removeItem("rememberedIdentifier");
          AsyncStorage.removeItem("rememberedPassword");
          AsyncStorage.removeItem("rememberMe");
        }

        console.log("Login successful:", data);
        setMessage("");
        setUser(data.user);
        nav.replace("dashboard");
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
      behavior={
        Platform.OS === "ios" || Platform.OS === "android"
          ? "padding"
          : "height"
      }
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
          onChangeText={(e) => setFormData({ ...formData, identifier: e })}
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
        {getMessage ? <Text style={styles.error}>{getMessage}</Text> : null}
        <View style={styles.loginHelper}>
          <CheckBox
            title="Remember me"
            checkboxStyle={styles.checkBox}
            value={rememberMe}
            onValueChange={(val) => {
              setRememberMe(val);
              if (!val) {
                AsyncStorage.removeItem("rememberedIdentifier");
                AsyncStorage.removeItem("rememberedPassword");
                AsyncStorage.setItem("rememberMe", "false");
              } else {
                AsyncStorage.setItem("rememberMe", "true");
              }
            }}
          />

          <View style={styles.forgotPassLink}>
            <Button onPress={goToForgotPassword} label="Forgot Password?" />
          </View>
        </View>

        <Button
          onPress={validate}
          label="Login"
          buttonStyle={styles.button}
          buttonTextStyle={styles.buttonText}
        />
        {getMessage && (
          <AlertComp
            title={loginSuccess ? "Logged in Successfully" : "Login Error"}
            message={getMessage}
            onPressFunction={() => setMessage("")} // dismiss message
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
