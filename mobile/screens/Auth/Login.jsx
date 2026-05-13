import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import LoginLayout from "../../Layout/LoginLayout";
import { styles } from "../../stylesheets/styles";
import { useNavigation } from "@react-navigation/native";
import Button from "../../components/Button";
import CheckBox from "../../components/CheckBox";
import LoadingScreen from "../LoadingScreen";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
  const [showPassword, setShowPassword] = useState(false);
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
    loadSavedCredentials();
  }, []);

  const changeHandler = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

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

  const login = async () => {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`${API_BASE}/api/user/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-base": selectedBase,
        },
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

      const { user, token, refreshToken } = data;

      if (user?.status === "deactivated") {
        setMessage("This account is deactivated. Please contact support");
        return;
      }

      // ✅ FIXED TOKEN STORAGE (MATCHS API + CONTEXT)
      await AsyncStorage.setItem("currentUserToken", String(token));

      if (refreshToken) {
        await AsyncStorage.setItem("refreshToken", refreshToken);
      } else {
        await AsyncStorage.removeItem("refreshToken");
      }

      // remember me
      await AsyncStorage.setItem("rememberMe", rememberMe ? "true" : "false");

      if (rememberMe) {
        await AsyncStorage.setItem(
          "rememberedIdentifier",
          formData.identifier.trim(),
        );
        await AsyncStorage.setItem("rememberedBase", selectedBase);
      } else {
        await AsyncStorage.removeItem("rememberedIdentifier");
        await AsyncStorage.removeItem("rememberedBase");
      }

      // security redirect
      if (user?.status === "inactive" || user?.setupToken) {
        nav.replace("securitySetup", {
          email: user.email,
          setupToken: user.setupToken,
        });
        return;
      }

      setLoginSuccess(true);

      await loginUser({
        user,
        accessToken: token,
        refreshToken,
      });

      const pendingRedirect = await readPendingRedirect();

      if (pendingRedirect && pendingRedirect.screen) {
        await clearPendingRedirect();

        nav.replace("dashboard", {
          screen: pendingRedirect.screen,
          params: pendingRedirect.params || {},
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
    return <LoadingScreen message="Signing you in..." showLogo />;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <LoginLayout
          cardTitle="Login"
          cardsubTitle="Sign in to access your AirMS account"
        >
          <Text style={[styles.label, { textAlign: "left" }]}>
            Username or Email
          </Text>
          <TextInput
            style={styles.formInput}
            maxLength={256}
            placeholder="Username or Email"
            placeholderTextColor="gray"
            autoCapitalize="none"
            keyboardType="default"
            value={formData.identifier}
            onChangeText={(text) => changeHandler("identifier", text)}
          />
          <Text style={styles.label}>Password</Text>
          <View style={{ position: "relative", justifyContent: "center" }}>
            <TextInput
              style={[styles.formInput, { paddingRight: 50 }]}
              maxLength={256}
              placeholder="Password"
              placeholderTextColor="gray"
              autoCapitalize="none"
              secureTextEntry={!showPassword} // Toggle based on state
              keyboardType="default"
              value={formData.password}
              onChangeText={(t) => changeHandler("password", t)}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: 10,
                height: "100%",
                justifyContent: "center",
                paddingHorizontal: 10,
              }}
            >
              <MaterialCommunityIcons
                name={showPassword ? "eye-off" : "eye"}
                size={21}
                color="#059670" // Matching your theme color
              />
            </TouchableOpacity>
          </View>
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
              checkboxStyle={styles.checkBox}
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
