import React, { useState, useEffect, useContext } from "react";
import AppText from "../../components/common/AppText";
import AppInput from "../../components/common/AppInput";
import {
  View,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  secureDeleteItem,
  secureGetItem,
  secureSetItem,
} from "../../utilities/secureStorage";
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

const BASE_OPTIONS = [
  { label: "Manila", value: "MANILA" },
  { label: "Cebu", value: "CEBU" },
  { label: "CDO", value: "CDO" },
];

const getTrustedDeviceStorageKey = (account) => {
  const normalizedAccount = String(account || "").trim().toLowerCase();
  return normalizedAccount ? `trustedDeviceToken:${normalizedAccount}` : "";
};

const REMEMBERED_PASSWORD_KEY = "rememberedPassword";

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
  const [showBaseDropdown, setShowBaseDropdown] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);
  // Load saved credentials on mount
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const savedRememberMe = await AsyncStorage.getItem("rememberMe");
        setRememberMe(savedRememberMe === "true");
        if (savedRememberMe === "true") {
          const savedIdentifier = await AsyncStorage.getItem(
            "rememberedIdentifier",
          );
          const savedPassword = await secureGetItem(REMEMBERED_PASSWORD_KEY);

          setFormData({
            identifier: savedIdentifier || "",
            password: savedPassword || "",
          });
          setSelectedBase((await AsyncStorage.getItem("rememberedBase")) || "");
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
      const trustedDeviceKey = getTrustedDeviceStorageKey(formData.identifier);
      const trustedDeviceToken =
        trustedDeviceKey ? await secureGetItem(trustedDeviceKey) : "";

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
          "x-platform": "MOBILE",
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
        if (rememberMe) {
          await secureSetItem(REMEMBERED_PASSWORD_KEY, formData.password.trim());
        } else {
          await secureDeleteItem(REMEMBERED_PASSWORD_KEY);
        }

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
        await secureSetItem(REMEMBERED_PASSWORD_KEY, formData.password.trim());
      } else {
        await AsyncStorage.removeItem("rememberedIdentifier");
        await AsyncStorage.removeItem("rememberedBase");
        await secureDeleteItem(REMEMBERED_PASSWORD_KEY);
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

  const selectedBaseLabel =
    BASE_OPTIONS.find((option) => option.value === selectedBase)?.label ||
    "Select base";

  const selectBase = (base) => {
    setSelectedBase(base);
    setShowBaseDropdown(false);
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
            placeholder="Enter your username or email"
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
              placeholder="Enter your password"
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
          <View style={loginDropdownStyles.wrap}>
            <TouchableOpacity
              style={loginDropdownStyles.button}
              activeOpacity={0.82}
              onPress={() => setShowBaseDropdown((open) => !open)}
            >
              <AppText
                style={[
                  loginDropdownStyles.buttonText,
                  { color: selectedBase ? "#111827" : "gray" },
                ]}
                numberOfLines={1}
              >
                {selectedBaseLabel}
              </AppText>
              <MaterialCommunityIcons
                name={showBaseDropdown ? "chevron-up" : "chevron-down"}
                size={22}
                color="gray"
              />
            </TouchableOpacity>

            {showBaseDropdown && (
              <View style={loginDropdownStyles.menu}>
                {BASE_OPTIONS.map((option, index) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      loginDropdownStyles.item,
                      index < BASE_OPTIONS.length - 1
                        ? loginDropdownStyles.itemBordered
                        : null,
                    ]}
                    onPress={() => selectBase(option.value)}
                  >
                    <AppText style={loginDropdownStyles.itemText}>
                      {option.label}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
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
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
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

const loginDropdownStyles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
  },
  buttonText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    marginRight: 8,
  },
  menu: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    marginTop: 6,
    overflow: "hidden",
    zIndex: 1000,
  },
  item: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  itemBordered: {
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
  },
  itemText: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "500",
  },
});
