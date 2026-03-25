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

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState({});

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinErrors, setPinErrors] = useState({});
  const [validationMessage, setValidationMessage] = useState("");

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const getPasswordStrength = () => {
    if (!newPassword) return { text: "", color: "transparent" };

    const requirements = [
      newPassword.length >= 8,
      /[A-Z]/.test(newPassword),
      /\d/.test(newPassword),
      /[a-z]/.test(newPassword),
    ];

    const passedCount = requirements.filter(Boolean).length;

    // Matching your Web colors
    if (passedCount <= 2) return { text: "Weak Password", color: "#ff4d4f" };
    if (passedCount === 3)
      return { text: "Moderate Password", color: "#faad14" };
    if (passedCount === 4) return { text: "Strong Password", color: "#00c88c" };

    return { text: "", color: "transparent" };
  };

  const strength = getPasswordStrength();

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
    setCurrentPassword("");
    setCurrentPin("");
    setNewPassword("");
    setConfirmPassword("");
    setNewPin("");
    setConfirmPin("");
    scrollToInput(0);
  };

  const scrollToInput = (y) => {
    scrollRef.current?.scrollTo({ y: y, animated: true });
  };

  const handleSave = async (type) => {
    setValidationMessage("");
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

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed.");

      setValidationMessage(`${type} updated successfully!`);
      resetAll();
    } catch (err) {
      setValidationMessage(err.message);
      Alert.alert("Error", err.message);
    }
  };

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

            <View style={{ height: 20, justifyContent: "center" }}>
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
            </View>

            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-type new password"
              onFocus={() => {
                scrollToInput(250);
                setNeedScrollHeight(300);
              }}
              onBlur={() => {
                scrollToInput(0);
                setNeedScrollHeight(10);
              }}
            />

            {validationMessage ? (
              <View style={{ marginTop: 10 }}>
                <Text
                  style={{
                    color: validationMessage.includes("successfully")
                      ? "#00c88c"
                      : "#ff4d4f",
                    textAlign: "center",
                  }}
                >
                  {validationMessage}
                </Text>
              </View>
            ) : null}

            <Button
              mode="contained"
              style={styles.mainBtn}
              disabled={!Object.values(passwordErrors).every(Boolean)}
              onPress={() => handleSave("Password")}
            >
              Save Password
            </Button>
          </View>
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
              onPress={() => handleSave("PIN")}
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
