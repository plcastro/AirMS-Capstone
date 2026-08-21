import React, { useState, useEffect, useContext } from "react";
import AppPaperInput from "../../components/common/AppPaperInput";
import { View, StyleSheet } from "react-native";
import { SegmentedButtons, Text } from "react-native-paper";
import Button from "../../components/common/AsyncPaperButton";
import { AuthContext } from "../../Context/AuthContext";
import CodeInputField from "../../components/CodeInputField";
import { API_BASE } from "../../utilities/API_BASE";
import { showToast } from "../../utilities/toast";
import { COLORS } from "../../stylesheets/colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
export default function UpdateSecurity() {
  const { user } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState("password");

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

  const [actionLoadingKey, setActionLoadingKey] = useState("");

  const securityTabs = [
    {
      value: "password",
      label: "Password",
      style: [
        styles.tabButton,
        activeTab === "password" && styles.tabButtonActive,
      ],
      labelStyle: [
        styles.tabLabel,
        activeTab === "password" && styles.tabLabelActive,
      ],
      checkedColor: COLORS.white,
      uncheckedColor: COLORS.grayDark,
    },
    {
      value: "pin",
      label: "PIN",
      style: [styles.tabButton, activeTab === "pin" && styles.tabButtonActive],
      labelStyle: [
        styles.tabLabel,
        activeTab === "pin" && styles.tabLabelActive,
      ],
      checkedColor: COLORS.white,
      uncheckedColor: COLORS.grayDark,
    },
  ];

  const runWithLoading = async (key, action) => {
    if (actionLoadingKey) return;
    setActionLoadingKey(key);
    try {
      await action();
    } finally {
      setActionLoadingKey("");
    }
  };

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

  const isValidPinReset = /^\d{6}$/.test(newPin) && newPin === confirmPin;
  const isValidOtp = /^\d{6}$/.test(otp);

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
  };

  // --- Save Password or PIN ---
  const handleSave = async (type) => {
    if (type === "PIN" && !isValidPinReset) {
      showToast("New PIN and Confirm PIN must match and be exactly 6 digits.");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("currentUserToken");
      const endpoint = type === "Password" ? "change-password" : "update-pin";
      const payload =
        type === "Password"
          ? { currentPassword, newPassword }
          : { currentPin, newPin };

      const res = await fetch(`${API_BASE}/api/user/${endpoint}/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || user.token}`,
          "x-action-confirmed": "true",
          "x-confirm-action": "true",
        },
        body: JSON.stringify({
          ...payload,
          confirmAction: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed.");
      showToast(`${type} updated successfully!`);
      resetAll();
    } catch (err) {
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

      console.log("REQUEST OTP RESPONSE:", data);
      console.log("TOKEN FROM REQUEST:", data.token);

      setOtpSent(true);
      setPinResetToken(data.token);
      showToast("OTP sent to your email.");
    } catch (err) {
      showToast(err.message);
    }
  };

  const verifyOtp = async () => {
    if (!isValidOtp) {
      showToast("Please enter the complete 6-digit OTP.");
      return;
    }

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
      const message = String(data?.message || "");

      if (!res.ok) {
        if (message.toLowerCase().includes("expired")) {
          setOtpSent(false);
          showToast("OTP expired! Please request a new one.");
        } else {
          throw new Error(message || "OTP verification failed");
        }
        return;
      }

      setOtpVerified(true);
      showToast("OTP verified! You can now reset your PIN.");
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleReset = async (type) => {
    if (type === "PIN") {
      if (!isValidPinReset) {
        showToast("New PIN and Confirm PIN must match and be exactly 6 digits.");
        return;
      }

      try {
        const token = await AsyncStorage.getItem("currentUserToken");
        const res = await fetch(`${API_BASE}/api/user/reset-pin`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token || user.token}`,
            "x-action-confirmed": "true",
            "x-confirm-action": "true",
          },
          body: JSON.stringify({
            token: pinResetToken,
            newPin,
            confirmAction: true,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        showToast("PIN successfully reset!");
        resetAll();
      } catch (err) {
        showToast(err.message);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Update Security</Text>
        <Text style={styles.subtitle}>
          Manage your account password and six-digit security PIN.
        </Text>
      </View>

      <SegmentedButtons
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val);
          resetAll();
        }}
        buttons={securityTabs}
        style={styles.tabs}
        density="regular"
      />

      {activeTab === "password" && (
        <View style={styles.section}>
          <AppPaperInput
            label="Current Password *"
            mode="outlined"
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
            style={styles.input}
          />
          <AppPaperInput
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
          <AppPaperInput
            label="Confirm Password *"
            mode="outlined"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            style={styles.input}
          />
          <Button
            mode="contained"
            loading={actionLoadingKey === "save-password"}
            disabled={!Object.values(passwordErrors).every(Boolean)}
            onPress={() =>
              runWithLoading("save-password", () => handleSave("Password"))
            }
            style={styles.mainBtn}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
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
              {renderCodeField("New PIN", newPin, setNewPin, {
                secure: !showPin,
              })}
              {renderCodeField("Confirm PIN", confirmPin, setConfirmPin, {
                secure: !showPin,
              })}
              <View style={styles.inlineActions}>
                <Button
                  mode="text"
                  loading={actionLoadingKey === "forgot-pin"}
                  onPress={() => setForgotPinMode(true)}
                  compact
                  style={styles.linkButton}
                >
                  Forgot PIN?
                </Button>
                <Button
                  mode="text"
                  loading={actionLoadingKey === "toggle-pin-1"}
                  onPress={() => setShowPin((current) => !current)}
                  compact
                  style={styles.linkButton}
                >
                  {showPin ? "Hide PIN" : "Show PIN"}
                </Button>
              </View>
              <Button
                mode="contained"
                loading={actionLoadingKey === "save-pin"}
                disabled={!isValidPinReset}
                onPress={() =>
                  runWithLoading("save-pin", () => handleSave("PIN"))
                }
                style={styles.mainBtn}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                Save PIN
              </Button>
            </>
          )}

          {forgotPinMode && !otpSent && (
            <View style={styles.section}>
              <Text style={styles.flowTitle}>Reset PIN</Text>
              <AppPaperInput
                label="Current Password *"
                mode="outlined"
                secureTextEntry
                value={passwordForPin}
                onChangeText={setPasswordForPin}
                style={styles.input}
              />
              <Button
                mode="contained"
                loading={actionLoadingKey === "send-otp"}
                onPress={() => runWithLoading("send-otp", () => requestOtp())}
                disabled={!passwordForPin}
                style={styles.mainBtn}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                Send OTP
              </Button>
              <Button
                mode="outlined"
                loading={actionLoadingKey === "cancel-otp"}
                onPress={resetAll}
                style={styles.secondaryBtn}
                contentStyle={styles.buttonContent}
              >
                Cancel
              </Button>
            </View>
          )}

          {forgotPinMode && otpSent && !otpVerified && (
            <View style={styles.section}>
              <Text style={styles.flowTitle}>Verify OTP</Text>
              {renderCodeField("OTP", otp, setOtp)}
              <Button
                mode="contained"
                loading={actionLoadingKey === "verify-otp"}
                onPress={() => runWithLoading("verify-otp", () => verifyOtp())}
                disabled={!isValidOtp}
                style={styles.mainBtn}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                Verify OTP
              </Button>
              <Button
                mode="outlined"
                loading={actionLoadingKey === "otp-back"}
                onPress={() => setOtpSent(false)}
                style={styles.secondaryBtn}
                contentStyle={styles.buttonContent}
              >
                Back
              </Button>
            </View>
          )}

          {forgotPinMode && otpVerified && (
            <View style={styles.section}>
              <Text style={styles.flowTitle}>Create New PIN</Text>
              {renderCodeField("New PIN", newPin, setNewPin, {
                secure: !showPin,
              })}
              {renderCodeField("Confirm New PIN", confirmPin, setConfirmPin, {
                secure: !showPin,
              })}
              <Button
                mode="text"
                loading={actionLoadingKey === "toggle-pin-2"}
                onPress={() => setShowPin((current) => !current)}
                compact
                style={styles.linkButton}
              >
                {showPin ? "Hide PIN" : "Show PIN"}
              </Button>
              <Button
                mode="contained"
                loading={actionLoadingKey === "reset-pin"}
                disabled={!isValidPinReset}
                onPress={() =>
                  runWithLoading("reset-pin", () => handleReset("PIN"))
                }
                style={styles.mainBtn}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                Reset PIN
              </Button>
              <Button
                mode="outlined"
                loading={actionLoadingKey === "cancel-otp"}
                onPress={resetAll}
                style={styles.secondaryBtn}
                contentStyle={styles.buttonContent}
              >
                Cancel
              </Button>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 18,
  },
  header: {
    marginBottom: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  title: {
    color: COLORS.black,
    fontSize: 16,
    fontWeight: "700",
  },
  subtitle: {
    color: COLORS.grayDark,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  tabs: {
    marginBottom: 18,
    borderRadius: 10,
    backgroundColor: COLORS.white,
  },
  tabButton: {
    borderRadius: 10,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  tabButtonActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryLight,
  },
  tabLabel: {
    fontWeight: "700",
  },
  tabLabelActive: {
    color: COLORS.white,
  },
  section: { rowGap: 4 },
  input: { marginBottom: 12, backgroundColor: "#fff" },
  mainBtn: { marginTop: 12, borderRadius: 10 },
  secondaryBtn: { marginTop: 8, borderRadius: 10 },
  buttonContent: { minHeight: 46 },
  buttonLabel: { fontWeight: "700" },
  inlineActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: -2,
  },
  linkButton: { alignSelf: "flex-start" },
  pinInputGroup: {
    marginBottom: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: "#FAFBFC",
  },
  pinLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.black,
    marginBottom: 8,
  },
  pinCodeSection: { flex: 0, alignItems: "stretch", marginVertical: 0 },
  pinCodeContainer: { width: "100%" },
  hintText: { fontSize: 12, marginBottom: 10 },
  flowTitle: {
    color: COLORS.black,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
});
