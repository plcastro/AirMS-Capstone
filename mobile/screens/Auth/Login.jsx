import React, { useState, useEffect, useContext } from "react";
import AppText from "../../components/common/AppText";
import AppInput from "../../components/common/AppInput";
import {
  View,
  KeyboardAvoidingView,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { secureGetItem } from "../../utilities/secureStorage";
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
import PrivacyPolicyModal from "../../components/common/PrivacyPolicyModal";
import TermsAndConditionsModal from "../../components/common/TermsAndConditionsModal";
import {
  readPendingRedirect,
  clearPendingRedirect,
} from "../../utilities/pendingRedirect";

export default function Login() {
  const nav = useNavigation();
  const { loginUser } = useContext(AuthContext);

  const [formData, setFormData] = useState({ identifier: "", password: "" });
  const [selectedBase, setSelectedBase] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [getMessage, setMessage] = useState("");
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);
  // Load saved credentials on mount
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const savedRememberMe = await AsyncStorage.getItem("rememberMe");
        if (savedRememberMe === "true") {
          const savedIdentifier = await AsyncStorage.getItem(
            "rememberedIdentifier",
          );

          setFormData({
            identifier: savedIdentifier || "",
            password: "",
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
      const trustedDeviceToken =
        (await secureGetItem("trustedDeviceToken")) ||
        (await AsyncStorage.getItem("trustedDeviceToken")) ||
        "";

      const parseResponse = async (res) => {
        const text = await res.text();
        try {
          return text ? JSON.parse(text) : {};
        } catch {
          return { message: text || "Unexpected server response" };
        }
      };

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
          rememberMe,
          base: selectedBase,
          trustedDeviceToken,
        }),
      });

      const data = await parseResponse(res);

      if (!res.ok) {
        setMessage(data.message || "Login failed");
        return;
      }

      if (data.requireSetup) {
        nav.replace("securitySetup", {
          email: data.user?.email,
          setupToken: data.user?.setupToken,
        });
        return;
      }

      if (data.requireLoginOtp && data.verification?.token) {
        nav.replace("otpScreen", {
          mode: "login-2fa",
          token: data.verification.token,
          email: data.verification.email,
          maskedEmail: data.verification.maskedEmail,
          identifier: formData.identifier.trim(),
          rememberMe,
          base: selectedBase,
          client: "mobile",
        });
        return;
      }

      const { user, token, refreshToken } = data;
      if (!user || !token) {
        setMessage(data.message || "Invalid login response");
        return;
      }

      if (user?.status === "deactivated") {
        setMessage("This account is deactivated. Please contact support");
        return;
      }

      // ✅ FIXED TOKEN STORAGE (MATCHS API + CONTEXT)
      await AsyncStorage.setItem("currentUserToken", String(token));

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
        rememberMe,
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
          <AppText style={[styles.label, { textAlign: "left" }]}>
            Username or Email
          </AppText>
          <AppInput
            style={styles.formInput}
            maxLength={256}
            placeholder="Username or Email"
            placeholderTextColor="gray"
            autoCapitalize="none"
            keyboardType="default"
            value={formData.identifier}
            onChangeText={(text) => changeHandler("identifier", text)}
          />
          <AppText style={styles.label}>Password</AppText>
          <View style={{ position: "relative", justifyContent: "center" }}>
            <AppInput
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
          <AppText style={styles.label}>Logging in from</AppText>
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
            <AppText style={styles.error}>{getMessage}</AppText>
          )}
          <View style={styles.loginHelper}>
            <CheckBox
              title="Stay signed in"
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
          <View style={{ marginTop: 16, alignItems: "center" }}>
            <AppText style={{ color: "gray", textAlign: "center" }}>
              By signing in, you agree to the
            </AppText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }}>
              <TouchableOpacity onPress={() => setTermsVisible(true)}>
                <AppText style={{ color: "#059670", fontWeight: "700" }}>
                  Terms and Conditions
                </AppText>
              </TouchableOpacity>
              <AppText style={{ color: "gray" }}> and </AppText>
              <TouchableOpacity onPress={() => setPrivacyVisible(true)}>
                <AppText style={{ color: "#059670", fontWeight: "700" }}>
                  Privacy Policy
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </LoginLayout>
      </ScrollView>
      <PrivacyPolicyModal
        visible={privacyVisible}
        onClose={() => setPrivacyVisible(false)}
      />
      <TermsAndConditionsModal
        visible={termsVisible}
        onClose={() => setTermsVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}
