import React, { useState, useEffect, useContext, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Button, SegmentedButtons, HelperText } from "react-native-paper";
import { AuthContext } from "../../Context/AuthContext";
import { API_BASE } from "../../utilities/API_BASE";

export default function UpdateSecurity() {
  const { user } = useContext(AuthContext);
  const scrollRef = useRef(null);
  const [activeTab, setActiveTab] = useState("password");
  const [needScrollHeight, setNeedScrollHeight] = useState(0);

  // --- STATE MANAGEMENT ---
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState({});
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinErrors, setPinErrors] = useState({});
  const [forgotPinMode, setForgotPinMode] = useState(false);

  const [verifyEmail, setVerifyEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // --- VALIDATION EFFECTS ---
  useEffect(() => {
    setPasswordErrors({
      minLength: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      number: /\d/.test(newPassword),
      match: newPassword === confirmPassword && confirmPassword !== "",
    });
  }, [newPassword, confirmPassword]);

  useEffect(() => {
    setPinErrors({
      isSixDigits: newPin.length === 6,
      match: newPin === confirmPin && newPin.length === 6,
    });
  }, [newPin, confirmPin]);

  // --- UI HANDLERS ---
  const resetAll = () => {
    setVerifyEmail("");
    setOtp("");
    setOtpSent(false);
    setOtpVerified(false);
    setCurrentPassword("");
    setCurrentPin("");
    setNewPassword("");
    setConfirmPassword("");
    setNewPin("");
    setConfirmPin("");
    setForgotPasswordMode(false);
    setForgotPinMode(false);
    scrollToInput(0);
  };

  const scrollToInput = (y) => {
    scrollRef.current?.scrollTo({ y: y, animated: true });
  };

  // --- API HANDLERS ---
  const requestOtp = async (type) => {
    try {
      const res = await fetch(`${API_BASE}/api/user/request-reset-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifyEmail, type: type.toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send OTP");
      Alert.alert("Success", `OTP sent to ${verifyEmail}`);
      setOtpSent(true);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const verifyOtp = async (type) => {
    try {
      const res = await fetch(`${API_BASE}/api/user/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: verifyEmail,
          otp,
          type: type.toLowerCase(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid OTP");
      setOtpVerified(true);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const handleReset = async (type) => {
    try {
      const endpoint = type === "Password" ? "reset-password" : "reset-pin";
      const payload =
        type === "Password"
          ? { email: verifyEmail, newPassword }
          : { email: verifyEmail, newPin };

      const res = await fetch(`${API_BASE}/api/user/${endpoint}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Failed to reset ${type}`);
      Alert.alert("Success", `${type} updated via Reset!`);
      resetAll();
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const handleSaveStandard = async (type) => {
    try {
      const endpoint = type === "Password" ? "change-password" : "change-pin";
      const payload =
        type === "Password"
          ? { currentPassword, newPassword }
          : { currentPin, newPin };

      const res = await fetch(`${API_BASE}/api/user/${endpoint}/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Update failed. Check current credentials.");
      Alert.alert("Success", `${type} updated!`);
      resetAll();
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  // --- RENDER HELPERS ---
  const renderForgotFlow = (type) => (
    <View style={styles.section}>
      {!otpSent ? (
        <>
          <Text style={styles.label}>Verify Email to Reset {type}</Text>
          <TextInput
            style={styles.input}
            value={verifyEmail}
            onChangeText={setVerifyEmail}
            placeholder="Enter email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Button
            mode="contained"
            style={styles.mainBtn}
            disabled={!isValidEmail(verifyEmail)}
            onPress={() => requestOtp(type)}
          >
            Send OTP
          </Button>
          <Button onPress={resetAll}>Cancel</Button>
        </>
      ) : !otpVerified ? (
        <>
          <Text style={styles.label}>Enter 6-Digit OTP</Text>
          <TextInput
            style={styles.input}
            value={otp}
            onChangeText={setOtp}
            keyboardType="numeric"
            maxLength={6}
            placeholder="000000"
          />
          <Button
            mode="contained"
            style={styles.mainBtn}
            onPress={() => verifyOtp(type)}
          >
            Verify OTP
          </Button>
          <Button onPress={() => setOtpSent(false)}>Back</Button>
        </>
      ) : (
        <>
          <Text style={styles.label}>New {type}</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={type === "Password" ? newPassword : newPin}
            onChangeText={type === "Password" ? setNewPassword : setNewPin}
            keyboardType={type === "PIN" ? "numeric" : "default"}
            maxLength={type === "PIN" ? 6 : undefined}
            placeholder={`New ${type}`}
          />
          <Text style={styles.label}>Confirm New {type}</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={type === "Password" ? confirmPassword : confirmPin}
            onChangeText={
              type === "Password" ? setConfirmPassword : setConfirmPin
            }
            keyboardType={type === "PIN" ? "numeric" : "default"}
            maxLength={type === "PIN" ? 6 : undefined}
            placeholder={`Confirm ${type}`}
            onFocus={() => scrollToInput(250)}
            onBlur={() => scrollToInput(0)}
          />
          <Button
            mode="contained"
            style={styles.mainBtn}
            disabled={
              type === "Password"
                ? !Object.values(passwordErrors).every(Boolean)
                : !Object.values(pinErrors).every(Boolean)
            }
            onPress={() => handleReset(type)}
          >
            Reset {type}
          </Button>
        </>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <SegmentedButtons
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val);
            resetAll();
          }}
          buttons={[
            { value: "password", label: "Password" },
            { value: "pin", label: "PIN" },
          ]}
          style={styles.tabs}
        />
        {activeTab === "password" ? (
          forgotPasswordMode ? (
            renderForgotFlow("Password")
          ) : (
            <View style={styles.section}>
              <Text style={styles.label}>Current Password</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="********"
              />
              <TouchableOpacity onPress={() => setForgotPasswordMode(true)}>
                <Text style={styles.link}>Forgot Password?</Text>
              </TouchableOpacity>
              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="********"
              />
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="********"
                onFocus={() => {
                  scrollToInput(250);
                  setNeedScrollHeight(300);
                }}
                onBlur={() => {
                  scrollToInput(0);
                  setNeedScrollHeight(10);
                }}
              />
              <HelperText type="info">
                Min 8 chars, 1 uppercase, 1 number.
              </HelperText>
              <Button
                mode="contained"
                style={styles.mainBtn}
                disabled={!Object.values(passwordErrors).every(Boolean)}
                onPress={() => handleSaveStandard("Password")}
              >
                Save Password
              </Button>
            </View>
          )
        ) : forgotPinMode ? (
          renderForgotFlow("PIN")
        ) : (
          <View style={styles.section}>
            <Text style={styles.label}>Current 6-Digit PIN</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={currentPin}
              onChangeText={setCurrentPin}
              keyboardType="numeric"
              maxLength={6}
              placeholder="000000"
            />
            <TouchableOpacity onPress={() => setForgotPinMode(true)}>
              <Text style={styles.link}>Forgot PIN?</Text>
            </TouchableOpacity>
            <Text style={styles.label}>New PIN</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={newPin}
              onChangeText={setNewPin}
              keyboardType="numeric"
              maxLength={6}
              placeholder="000000"
            />
            <Text style={styles.label}>Confirm PIN</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={confirmPin}
              onChangeText={setConfirmPin}
              keyboardType="numeric"
              maxLength={6}
              placeholder="000000"
              onFocus={() => {
                scrollToInput(250);
                setNeedScrollHeight(300);
              }}
              onBlur={() => {
                scrollToInput(0);
                setNeedScrollHeight(10);
              }}
            />
            <Button
              mode="contained"
              style={styles.mainBtn}
              disabled={!Object.values(pinErrors).every(Boolean)}
              onPress={() => handleSaveStandard("PIN")}
            >
              Save PIN
            </Button>
          </View>
        )}
        <View style={{ height: needScrollHeight }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flexGrow: 1 },
  tabs: { marginBottom: 20 },
  section: { gap: 10 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginTop: 5 },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  link: { color: "#2196F3", marginVertical: 8, fontWeight: "bold" },
  mainBtn: { marginTop: 15, paddingVertical: 5 },
});
