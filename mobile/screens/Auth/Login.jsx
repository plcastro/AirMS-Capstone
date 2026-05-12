import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import LoginLayout from "../../Layout/LoginLayout";
import { styles } from "../../stylesheets/styles";
import Button from "../../components/Button";
import CheckBox from "../../components/CheckBox";
import LoadingScreen from "../LoadingScreen";

import { AuthContext } from "../../Context/AuthContext";
import { API_BASE } from "../../utilities/API_BASE";
import {
  readPendingRedirect,
  clearPendingRedirect,
} from "../../utilities/pendingRedirect";

export default function Login() {
  const nav = useNavigation();
  const { loginUser } = useContext(AuthContext);

  const [formData, setFormData] = useState({ identifier: "", password: "" });
  const [selectedBase, setSelectedBase] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [getMessage, setMessage] = useState("");
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
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
          setSelectedBase((await AsyncStorage.getItem("rememberedBase")) || "");
          setRememberMe(true);
        }
      } catch (err) {
        console.error(err);
      }
    };

    load();
  }, []);

  const changeHandler = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // =========================
  // VALIDATION
  // =========================
  const validate = () => {
    const { identifier, password } = formData;
    if (!identifier.trim() && !password.trim())
      return setMessage("Please enter your username/email and password");
    if (!identifier.trim())
      return setMessage("Please enter your username or email");
    if (!password.trim()) return setMessage("Please enter your password");
    if (!selectedBase) {
      return setMessage("Please select where you are logging in from");
    }

    login();
  };

  // =========================
  // LOGIN REQUEST
  // =========================
  const login = async () => {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`${API_BASE}/api/user/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-base": selectedBase },
        body: JSON.stringify({
          identifier: formData.identifier.trim(),
          password: formData.password.trim(),
          client: "mobile",
          base: selectedBase,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Login failed");
        return;
      }

      if (response.ok) {
        const { user, token } = data;

        // Deactivated account
        if (user.status === "deactivated") {
          setMessage(
            "This account is deactivated. Please contact AirMS Support",
          );
          return;
        }

        // Remember me logic
        if (rememberMe) {
          await AsyncStorage.setItem("token", token);
          await AsyncStorage.setItem("rememberMe", "true");
          await AsyncStorage.setItem(
            "rememberedIdentifier",
            formData.identifier.trim(),
          );
          await AsyncStorage.setItem("rememberedBase", selectedBase);
        } else {
          await AsyncStorage.setItem("token", token);
          await AsyncStorage.setItem("rememberMe", "false");
          await AsyncStorage.removeItem("rememberedIdentifier");
          await AsyncStorage.removeItem("rememberedBase");
        }

        // Inactive users go to security setup
        if (user.status === "inactive" || user.setupToken) {
          nav.replace("securitySetup", {
            email: user.email,
            setupToken: user.setupToken,
          });
          return;
        }
        setLoginSuccess(true);
        await loginUser(user, token);
        const pendingRedirect = await readPendingRedirect();

        if (pendingRedirect?.screen) {
          await clearPendingRedirect();
          nav.replace("dashboard", {
            screen: pendingRedirect.screen,
            params: pendingRedirect.params || {},
          });
          return;
        }

        nav.replace("dashboard");
      } else {
        console.log("Login error message:", data.message);
        setMessage(data.message || "Login failed");
      }

      const role = (user.jobTitle || "").toLowerCase();

      const allowed = [
        "maintenance manager",
        "pilot",
        "officer-in-charge",
        "mechanic",
      ];

      // =========================
      // ACCOUNT CHECKS
      // =========================
      if (user.status === "deactivated") {
        setMessage("Account deactivated");
        return;
      }

      if (!allowed.includes(role)) {
        setMessage("Web portal only account");
        return;
      }

      // =========================
      // REMEMBER ME
      // =========================
      if (rememberMe) {
        await AsyncStorage.setItem("rememberMe", "true");
        await AsyncStorage.setItem(
          "rememberedIdentifier",
          formData.identifier.trim(),
        );
      } else {
        await AsyncStorage.setItem("rememberMe", "false");
        await AsyncStorage.removeItem("rememberedIdentifier");
      }

      // =========================
      // SECURITY SETUP
      // =========================
      if (user.status === "inactive" || user.setupToken) {
        nav.replace("securitySetup", {
          email: user.email,
          setupToken: user.setupToken,
        });
        return;
      }

      // =========================
      // AUTH STORE
      // =========================
      await loginUser({
        user,
        accessToken,
        refreshToken: data.refreshToken || null,
      });

      // =========================
      // REDIRECT HANDLING
      // =========================
      const redirect = await readPendingRedirect();

      if (redirect?.screen) {
        await clearPendingRedirect();

        nav.replace("dashboard", {
          screen: redirect.screen,
          params: redirect.params || {},
        });
        return;
      }

      nav.replace("dashboard");
    } catch (err) {
      console.error(err);
      setMessage("Login error. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  const goToForgotPassword = () => {
    const email = formData.identifier.includes("@")
      ? formData.identifier.trim()
      : "";

    nav.navigate("forgotPassword", { email });
  };

  if (loading) {
    return <LoadingScreen message="Signing you in..." />;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <LoginLayout cardTitle="Login" cardsubTitle="Sign in to AirMS">
          <Text style={styles.label}>Username or Email</Text>

          <TextInput
            style={styles.formInput}
            placeholder="Username or Email"
            value={formData.identifier}
            onChangeText={(t) => changeHandler("identifier", t)}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>

          <TextInput
            style={styles.formInput}
            placeholder="Password"
            secureTextEntry
            value={formData.password}
            onChangeText={(t) => changeHandler("password", t)}
          />
          <Text style={styles.label}>Logging in from</Text>
          <View style={styles.loginPickerContainer}>
            <Picker
              selectedValue={selectedBase}
              onValueChange={setSelectedBase}
              style={styles.loginPicker}
            >
              <Picker.Item label="Select base" value="" />
              <Picker.Item label="Manila" value="MANILA" />
              <Picker.Item label="Cebu" value="CEBU" />
              <Picker.Item label="CDO" value="CDO" />
            </Picker>
          </View>
          {getMessage && !loginSuccess && (
            <Text style={styles.error}>{getMessage}</Text>
          )}
          <View style={styles.loginHelper}>
            <CheckBox
              title="Remember me"
              value={rememberMe}
              onValueChange={setRememberMe}
            />
            <View style={styles.forgotPassLink}>
              <Button
                onPress={goToForgotPassword}
                label="Forgot Password?"
                buttonTextStyle={{ color: "#059670" }}
              />
            </View>
          </View>
          <Button
            onPress={validate}
            label="LOGIN"
            disabled={loading}
            buttonStyle={[styles.primaryBtn]}
            buttonTextStyle={styles.primaryBtnTxt}
          />
        </LoginLayout>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
