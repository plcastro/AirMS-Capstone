import React, { useState, useEffect, useContext, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { Button, SegmentedButtons, HelperText } from "react-native-paper";
import { AuthContext } from "../../Context/AuthContext";
import { API_BASE } from "../../utilities/API_BASE";

export default function UpdateSecurity() {
  const { user, setUser } = useContext(AuthContext);
  const scrollRef = useRef(null);

  const [activeTab, setActiveTab] = useState("password");
  const [needScrollHeight, setNeedScrollHeight] = useState(0);

  // --- Password States ---
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState({});

  // --- PIN States ---
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinErrors, setPinErrors] = useState({});

  // --- Forgot PIN Flow ---
  const [forgotPinMode, setForgotPinMode] = useState(false);
  const [passwordForPin, setPasswordForPin] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [pinResetToken, setPinResetToken] = useState("");

  const [validationMessage, setValidationMessage] = useState("");

  // --- Password Validation & Strength ---
  useEffect(() => {
    setPasswordErrors({
      minLength: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      number: /\d/.test(newPassword),
      match: newPassword === confirmPassword && confirmPassword !== "",
    });
  }, [newPassword, confirmPassword]);

  const getPasswordStrength = () => {
    if (!newPassword) return { text: "", color: "transparent" };

    const requirements = [
      newPassword.length >= 8,
      /[A-Z]/.test(newPassword),
      /\d/.test(newPassword),
      /[a-z]/.test(newPassword),
    ];
    const passedCount = requirements.filter(Boolean).length;

    if (passedCount <= 2) return { text: "Weak Password", color: "#ff4d4f" };
    if (passedCount === 3)
      return { text: "Moderate Password", color: "#faad14" };
    if (passedCount === 4) return { text: "Strong Password", color: "#00c88c" };
    return { text: "", color: "transparent" };
  };

  const strength = getPasswordStrength();

  // --- PIN Validation ---
  useEffect(() => {
    setPinErrors({
      isSixDigits: newPin.length === 6,
      match: newPin === confirmPin && newPin.length === 6,
    });
  }, [newPin, confirmPin]);

  // --- Reset All Fields ---
  const resetAll = () => {
    setCurrentPassword("");
    setCurrentPin("");
    setNewPassword("");
    setConfirmPassword("");
    setNewPin("");
    setConfirmPin("");
    setPasswordForPin("");
    setOtp("");
    setOtpSent(false);
    setOtpVerified(false);
    setPinResetToken("");
    setForgotPinMode(false);
    setValidationMessage("");
    scrollToInput(0);
  };

  const scrollToInput = (y) => {
    scrollRef.current?.scrollTo({ y: y, animated: true });
  };

  // --- Save Password or PIN ---
  const handleSave = async (type) => {
    setValidationMessage("");
    try {
      const endpoint = type === "Password" ? "change-password" : "update-pin";
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

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed.");

      setValidationMessage(`${type} updated successfully!`);

      if (type === "PIN") setUser((prev) => ({ ...prev, pin: newPin }));

      resetAll();
    } catch (err) {
      setValidationMessage(err.message);
      Alert.alert("Error", err.message);
    }
  };

  // --- Forgot PIN OTP Flow ---
  const requestOtp = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/user/request-pin-reset/${user.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({ currentPassword: passwordForPin }),
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setOtpSent(true);
      setPinResetToken(data.token);
      setValidationMessage("OTP sent to your email.");
    } catch (err) {
      setValidationMessage(err.message);
    }
  };

  const verifyOtp = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/user/verify-pin-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ otp, token: pinResetToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.message.includes("expired")) {
          setOtpSent(false);
          setValidationMessage("OTP expired! Request a new one.");
        } else throw new Error(data.message);
        return;
      }

      setOtpVerified(true);
      setValidationMessage("OTP verified! You can now reset your PIN.");
    } catch (err) {
      setValidationMessage(err.message);
    }
  };

  const handleReset = async (type) => {
    if (type === "PIN") {
      try {
        const res = await fetch(`${API_BASE}/api/user/reset-pin`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({ token: pinResetToken, newPin }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        setUser((prev) => ({ ...prev, pin: newPin }));
        Alert.alert("Success", "PIN successfully reset!");
        resetAll();
      } catch (err) {
        Alert.alert("Error", err.message);
      }
    }
  };

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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

        {/* --- Password Tab --- */}
        {activeTab === "password" && (
          <View style={styles.section}>
            <Text style={styles.label}>Current Password</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Enter current password"
            />
            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
            />
            {newPassword ? (
              <Text
                style={{
                  color: strength.color,
                  fontWeight: "bold",
                  fontSize: 12,
                }}
              >
                {strength.text}
              </Text>
            ) : null}
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-type new password"
            />
            {validationMessage ? (
              <Text
                style={{
                  color: validationMessage.includes("successfully")
                    ? "#00c88c"
                    : "#ff4d4f",
                  textAlign: "center",
                  marginTop: 10,
                }}
              >
                {validationMessage}
              </Text>
            ) : null}
            <Button
              mode="contained"
              disabled={!Object.values(passwordErrors).every(Boolean)}
              onPress={() => handleSave("Password")}
              style={styles.mainBtn}
            >
              Save Password
            </Button>
          </View>
        )}

        {/* --- PIN Tab --- */}
        {activeTab === "pin" && (
          <View style={styles.section}>
            {!forgotPinMode && (
              <>
                <Text style={styles.label}>Current PIN</Text>
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
                />
                <Button
                  mode="contained"
                  disabled={!Object.values(pinErrors).every(Boolean)}
                  onPress={() => handleSave("PIN")}
                  style={styles.mainBtn}
                >
                  Save PIN
                </Button>
              </>
            )}

            {/* --- Forgot PIN Flow --- */}
            {forgotPinMode && !otpSent && (
              <View style={styles.section}>
                <Text style={styles.label}>
                  Enter Current Password to Reset PIN
                </Text>
                <TextInput
                  style={styles.input}
                  secureTextEntry
                  value={passwordForPin}
                  onChangeText={setPasswordForPin}
                  placeholder="Current password"
                />
                {validationMessage ? (
                  <Text style={{ color: "#ff4d4f" }}>{validationMessage}</Text>
                ) : null}
                <Button
                  mode="contained"
                  onPress={requestOtp}
                  disabled={!passwordForPin}
                  style={styles.mainBtn}
                >
                  Send OTP
                </Button>
                <Button onPress={resetAll}>Cancel</Button>
              </View>
            )}

            {forgotPinMode && otpSent && !otpVerified && (
              <View style={styles.section}>
                <Text style={styles.label}>Enter OTP</Text>
                <TextInput
                  style={styles.input}
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="000000"
                  keyboardType="numeric"
                  maxLength={6}
                />
                {validationMessage ? (
                  <Text style={{ color: "#ff4d4f" }}>{validationMessage}</Text>
                ) : null}
                <Button
                  mode="contained"
                  onPress={verifyOtp}
                  disabled={!otp}
                  style={styles.mainBtn}
                >
                  Verify OTP
                </Button>
                <Button onPress={() => setOtpSent(false)}>Back</Button>
              </View>
            )}

            {forgotPinMode && otpVerified && (
              <View style={styles.section}>
                <Text style={styles.label}>New PIN</Text>
                <TextInput
                  style={styles.input}
                  value={newPin}
                  onChangeText={setNewPin}
                  keyboardType="numeric"
                  maxLength={6}
                  secureTextEntry
                  placeholder="000000"
                />
                <Text style={styles.label}>Confirm New PIN</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPin}
                  onChangeText={setConfirmPin}
                  keyboardType="numeric"
                  maxLength={6}
                  secureTextEntry
                  placeholder="000000"
                />
                <Button
                  mode="contained"
                  disabled={!Object.values(pinErrors).every(Boolean)}
                  onPress={() => handleReset("PIN")}
                  style={styles.mainBtn}
                >
                  Reset PIN
                </Button>
              </View>
            )}
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
