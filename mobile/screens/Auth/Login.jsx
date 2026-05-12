import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

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

  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });

  const [rememberMe, setRememberMe] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // =========================
  // LOAD REMEMBERED DATA
  // =========================
  useEffect(() => {
    const load = async () => {
      const saved = await AsyncStorage.getItem("rememberMe");

      if (saved === "true") {
        const identifier = await AsyncStorage.getItem("rememberedIdentifier");

        setFormData((prev) => ({
          ...prev,
          identifier: identifier || "",
        }));

        setRememberMe(true);
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

    if (!identifier.trim() && !password.trim()) {
      setMessage("Enter username/email and password");
      return;
    }

    if (!identifier.trim()) {
      setMessage("Enter username or email");
      return;
    }

    if (!password.trim()) {
      setMessage("Enter password");
      return;
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: formData.identifier.trim(),
          password: formData.password.trim(),
          client: "mobile",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Login failed");
        return;
      }

      const user = data.user;
      const accessToken = data.token || data.accessToken;

      if (!user || !accessToken) {
        setMessage("Invalid server response");
        return;
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

          {!!message && <Text style={styles.error}>{message}</Text>}

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
