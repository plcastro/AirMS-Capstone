import React, { useState, useEffect, useContext } from "react";
import AppText from "../../components/common/AppText";
import AppInput from "../../components/common/AppInput";
import {
  View,
  KeyboardAvoidingView,
  Platform,
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
import { COLORS } from "../../stylesheets/colors";
import PrivacyPolicyModal from "../../components/common/PrivacyPolicyModal";
import TermsAndConditionsModal from "../../components/common/TermsAndConditionsModal";
import {
  readPendingRedirect,
  clearPendingRedirect,
} from "../../utilities/pendingRedirect";
import { getDeviceAuditHeaders } from "../../utilities/mobileApi";
import { setStoredAccessToken } from "../../utilities/authStorage";
import {
  buildLoginLocationHeaders,
  detectLoginLocation,
} from "../../utilities/loginLocation";

const getTrustedDeviceStorageKey = (account) => {
  const normalizedAccount = String(account || "")
    .trim()
    .toLowerCase();
  return normalizedAccount ? `trustedDeviceToken:${normalizedAccount}` : "";
};

const REMEMBERED_PASSWORD_KEY = "rememberedPassword";

export default function Login() {
  const nav = useNavigation();
  const { loginUser } = useContext(AuthContext);

  const [formData, setFormData] = useState({ identifier: "", password: "" });
  const [loginLocation, setLoginLocation] = useState(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [getMessage, setMessage] = useState("");
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);
  const loginClient = Platform.OS === "web" ? "web" : "mobile";
  const loginPlatform = Platform.OS === "web" ? "WEB" : "MOBILE";
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
      return setMessage("Username/email and password are required");
    if (!identifier.trim())
      return setMessage("Please enter your username or email");
    if (!password.trim()) return setMessage("Password is required");
    if (!loginLocation?.text) {
      return setMessage("Detect your login location before signing in.");
    }

    login();
  };

  const login = async () => {
    setLoading(true);
    setMessage("");

    try {
      const trustedDeviceKey = getTrustedDeviceStorageKey(formData.identifier);
      const trustedDeviceToken = trustedDeviceKey
        ? await secureGetItem(trustedDeviceKey)
        : "";

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
          "x-platform": loginPlatform,
          ...buildLoginLocationHeaders(loginLocation),
          ...getDeviceAuditHeaders(),
        },
        body: JSON.stringify({
          identifier: formData.identifier.trim(),
          password: formData.password.trim(),
          client: loginClient,
          rememberMe,
          location: loginLocation,
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
          await secureSetItem(
            REMEMBERED_PASSWORD_KEY,
            formData.password.trim(),
          );
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
          loginLocation,
          client: loginClient,
        });
        return;
      }

      const { user, token, refreshToken, session } = data;
      if (!user || !token) {
        setMessage(data.message || "Invalid login response");
        return;
      }

      if (user?.status === "deactivated") {
        setMessage("This account is deactivated. Please contact AirMS support");
        return;
      }

      // ✅ FIXED TOKEN STORAGE (MATCHS API + CONTEXT)
      await setStoredAccessToken(String(token));

      await AsyncStorage.setItem("rememberMe", rememberMe ? "true" : "false");
      if (rememberMe) {
        await AsyncStorage.setItem(
          "rememberedIdentifier",
          formData.identifier.trim(),
        );
        await secureSetItem(REMEMBERED_PASSWORD_KEY, formData.password.trim());
      } else {
        await AsyncStorage.removeItem("rememberedIdentifier");
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
        session:
          session ||
          {
            location: loginLocation,
            sessionId: data.sessionId,
            platform: loginPlatform,
          },
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
      setMessage("Login error. Please try again.");
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

  const handleDetectLocation = async () => {
    try {
      setDetectingLocation(true);
      setMessage("");
      const nextLocation = await detectLoginLocation();
      setLoginLocation(nextLocation);
    } catch (error) {
      setLoginLocation(null);
      setMessage(error.message || "Could not detect your login location.");
    } finally {
      setDetectingLocation(false);
    }
  };

  useEffect(() => {
    handleDetectLocation();
  }, []);

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
          <View style={loginLocationStyles.wrap}>
            <View style={loginLocationStyles.panel}>
              <MaterialCommunityIcons
                name={loginLocation?.text ? "map-marker-check" : "map-marker"}
                size={22}
                color={loginLocation?.text ? "#059670" : "gray"}
              />
              <View style={loginLocationStyles.textWrap}>
                <AppText
                  style={[
                    loginLocationStyles.locationText,
                    { color: loginLocation?.text ? "#111827" : "gray" },
                  ]}
                >
                  {loginLocation?.text || "Location not detected"}
                </AppText>
                {!!loginLocation?.coordinateText && (
                  <AppText style={loginLocationStyles.coordinateText}>
                    Latitude and longitude coordinates:{" "}
                    {loginLocation.coordinateText}
                  </AppText>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={[
                loginLocationStyles.detectButton,
                detectingLocation && loginLocationStyles.detectButtonDisabled,
              ]}
              activeOpacity={0.82}
              disabled={detectingLocation}
              onPress={handleDetectLocation}
            >
              <MaterialCommunityIcons
                name="crosshairs-gps"
                size={18}
                color={COLORS.white}
              />
              <AppText style={loginLocationStyles.detectButtonText}>
                {detectingLocation ? "Detecting..." : "Detect location"}
              </AppText>
            </TouchableOpacity>
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
            disabled={loading || detectingLocation}
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

const loginLocationStyles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  panel: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.grayMedium,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
  },
  textWrap: {
    flex: 1,
    marginLeft: 10,
  },
  locationText: {
    fontSize: 12,
    fontWeight: "600",
  },
  coordinateText: {
    color: COLORS.grayDark,
    fontSize: 11,
    marginTop: 4,
  },
  detectButton: {
    marginTop: 8,
    backgroundColor: "#059670",
    borderRadius: 8,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    columnGap: 8,
  },
  detectButtonDisabled: {
    opacity: 0.65,
  },
  detectButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "700",
  },
});
