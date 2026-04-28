import React, { useState, useEffect, useContext, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  Button,
  SegmentedButtons,
  HelperText,
  TextInput,
  Card,
  Text,
} from "react-native-paper";
import { AuthContext } from "../../Context/AuthContext";
import CodeInputField from "../../components/CodeInputField";
import { API_BASE } from "../../utilities/API_BASE";
import { showToast } from "../../utilities/toast";
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
  const [showPin, setShowPin] = useState(false);

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

  const renderCodeField = (label, value, setter, { secure = false } = {}) => (
    <View style={styles.pinInputGroup}>
      <Text style={styles.pinLabel}>{label} *</Text>
      <CodeInputField
        code={value}
        setCode={setter}
        maxLength={6}
        secure={secure}
        containerStyle={styles.pinCodeSection}
        inputContainerStyle={styles.pinCodeContainer}
      />
    </View>
  );

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
      showToast(err.message);
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
        showToast("PIN successfully reset!");
        resetAll();
      } catch (err) {
        showToast(err.message);
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
        <Card style={styles.card}>
          <Card.Content>
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

            {activeTab === "password" && (
              <View style={styles.section}>
                <TextInput
                  label="Current Password *"
                  mode="outlined"
                  secureTextEntry
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  style={styles.input}
                />
                <TextInput
                  label="New Password *"
                  mode="outlined"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  style={styles.input}
                />
                {newPassword ? (
                  <Text style={[styles.hintText, { color: strength.color }]}>
                    {strength.text}
                  </Text>
                ) : null}
                <TextInput
                  label="Confirm Password *"
                  mode="outlined"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  style={styles.input}
                />
                {validationMessage ? (
                  <Text
                    style={[
                      styles.validationText,
                      {
                        color: validationMessage.includes("successfully")
                          ? "#00c88c"
                          : "#ff4d4f",
                      },
                    ]}
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

            {activeTab === "pin" && (
              <View style={styles.section}>
                {!forgotPinMode && (
                  <>
                    {renderCodeField("Current PIN", currentPin, setCurrentPin, {
                      secure: !showPin,
                    })}
                    <Button
                      mode="text"
                      onPress={() => setForgotPinMode(true)}
                      compact
                      style={styles.linkButton}
                    >
                      Forgot PIN?
                    </Button>
                    {renderCodeField("New PIN", newPin, setNewPin, {
                      secure: !showPin,
                    })}
                    {renderCodeField("Confirm PIN", confirmPin, setConfirmPin, {
                      secure: !showPin,
                    })}
                    <Button
                      mode="text"
                      onPress={() => setShowPin((current) => !current)}
                      compact
                      style={styles.linkButton}
                    >
                      {showPin ? "Hide PIN" : "Show PIN"}
                    </Button>
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

                {forgotPinMode && !otpSent && (
                  <View style={styles.section}>
                    <TextInput
                      label="Current Password *"
                      mode="outlined"
                      secureTextEntry
                      value={passwordForPin}
                      onChangeText={setPasswordForPin}
                      style={styles.input}
                    />
                    {validationMessage ? (
                      <Text style={styles.validationText}>
                        {validationMessage}
                      </Text>
                    ) : null}
                    <Button
                      mode="contained"
                      onPress={requestOtp}
                      disabled={!passwordForPin}
                      style={styles.mainBtn}
                    >
                      Send OTP
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={resetAll}
                      style={styles.secondaryBtn}
                    >
                      Cancel
                    </Button>
                  </View>
                )}

                {forgotPinMode && otpSent && !otpVerified && (
                  <View style={styles.section}>
                    {renderCodeField("OTP", otp, setOtp)}
                    {validationMessage ? (
                      <Text style={styles.validationText}>
                        {validationMessage}
                      </Text>
                    ) : null}
                    <Button
                      mode="contained"
                      onPress={verifyOtp}
                      disabled={!otp}
                      style={styles.mainBtn}
                    >
                      Verify OTP
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={() => setOtpSent(false)}
                      style={styles.secondaryBtn}
                    >
                      Back
                    </Button>
                  </View>
                )}

                {forgotPinMode && otpVerified && (
                  <View style={styles.section}>
                    {renderCodeField("New PIN", newPin, setNewPin, {
                      secure: !showPin,
                    })}
                    {renderCodeField("Confirm New PIN", confirmPin, setConfirmPin, {
                      secure: !showPin,
                    })}
                    <Button
                      mode="text"
                      onPress={() => setShowPin((current) => !current)}
                      compact
                      style={styles.linkButton}
                    >
                      {showPin ? "Hide PIN" : "Show PIN"}
                    </Button>
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
          </Card.Content>
        </Card>

        <View style={{ height: needScrollHeight }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flexGrow: 1, backgroundColor: "#fff" },
  card: { borderRadius: 12, margin: 16, elevation: 2 },
  tabs: { marginBottom: 20 },
  section: { marginBottom: 16 },
  input: { marginBottom: 12, backgroundColor: "#fff" },
  mainBtn: { marginTop: 15 },
  secondaryBtn: { marginTop: 10 },
  linkButton: { alignSelf: "flex-start", marginBottom: 10 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 8 },
  pinInputGroup: { marginBottom: 12 },
  pinLabel: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 8 },
  pinCodeSection: { flex: 0, alignItems: "stretch", marginVertical: 0 },
  pinCodeContainer: { width: "100%" },
  validationText: { color: "#ff4d4f", textAlign: "center", marginTop: 10 },
  hintText: { fontSize: 12, marginBottom: 10 },
});
