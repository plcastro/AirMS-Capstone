import React, { useState, useEffect, useContext } from "react";
import { Row, Space, Input, Button, Typography, Tabs, message } from "antd";
import { AuthContext } from "../../context/AuthContext";
import { API_BASE } from "../../utils/API_BASE";
import { ClearOutlined } from "@ant-design/icons";
const { Text } = Typography;

export default function UpdateSecurity() {
  const { user, setUser } = useContext(AuthContext);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState({});

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinErrors, setPinErrors] = useState({});
  const [forgotPinMode, setForgotPinMode] = useState(false);
  const [passwordForPin, setPasswordForPin] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  const isValidPin = (pin) => {
    return /^\d*$/.test(pin);
  };
  const [validationMessage, setValidationMessage] = useState("");

  useEffect(() => {
    setPasswordErrors({
      minLength: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      number: /\d/.test(newPassword),
      match: newPassword === confirmPassword && confirmPassword !== "",
    });
  }, [newPassword, confirmPassword]);

  const getPasswordStrength = () => {
    if (!newPassword) return { text: "", color: "" };

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

    return { text: "", color: "" };
  };

  const strength = getPasswordStrength();

  useEffect(() => {
    setPinErrors({
      isSixDigits: newPin.length === 6,
      match: newPin === confirmPin && newPin.length === 6,
    });
  }, [newPin, confirmPin]);

  const resetAll = () => {
    setCurrentPassword("");
    setCurrentPin("");
    setNewPassword("");
    setConfirmPassword("");
    setNewPin("");
    setConfirmPin("");
  };

  const savePassword = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/user/change-password/${user.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("jwtToken")}`,
          },
          body: JSON.stringify({ currentPassword, newPassword }),
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setValidationMessage("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      message.error(err.message);
    }
  };

  const savePin = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/user/update-pin/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("jwtToken")}`,
        },
        body: JSON.stringify({ currentPin, newPin }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setUser((prev) => ({ ...prev, pin: newPin }));
      setValidationMessage("PIN successfully updated!");
    } catch (err) {
      message.error(err.message);
    }
  };

  const requestOtpForPin = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/user/verify-password-for-pin/${user.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("jwtToken")}`,
          },
          body: JSON.stringify({ password: passwordForPin }),
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setOtpSent(true);
      message.success("Verification OTP sent to your email!");
    } catch (err) {
      message.error(err.message);
    }
  };

  const verifyOtp = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/user/verify-pin-otp/${user.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("jwtToken")}`,
          },
          body: JSON.stringify({ otp }),
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setOtpVerified(true);
      message.success("OTP verified! You can now reset your PIN.");
    } catch (err) {
      message.error(err.message);
    }
  };

  const PasswordTab = (
    <Space orientation="vertical">
      <Input.Password
        size="large"
        placeholder="Current Password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
      />

      <Input.Password
        placeholder="New Password"
        size="large"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />
      <Input.Password
        placeholder="Confirm Password"
        size="large"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />

      <div style={{ height: "20px" }}>
        {newPassword && (
          <Text style={{ color: strength.color }}>{strength.text}</Text>
        )}
      </div>

      {validationMessage && (
        <Text
          type={
            validationMessage.includes("successfully") ? "success" : "danger"
          }
        >
          {validationMessage}
        </Text>
      )}

      <Row>
        <Button
          type="primary"
          onClick={savePassword}
          disabled={!Object.values(passwordErrors).every(Boolean)}
          style={{ marginRight: 10 }}
        >
          Save Password
        </Button>
        <Button type="default" onClick={resetAll}>
          <ClearOutlined />
        </Button>
      </Row>
    </Space>
  );

  const PinTab = (
    <Space orientation="vertical">
      {/* --- User remembers their current PIN --- */}
      {!forgotPinMode && (
        <>
          <Input.Password
            maxLength={6}
            inputMode="numeric"
            size="large"
            placeholder="Current PIN"
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
          />
          <Button type="link" onClick={() => setForgotPinMode(true)}>
            Forgot PIN?
          </Button>
          <Input.Password
            maxLength={6}
            inputMode="numeric"
            size="large"
            placeholder="New PIN"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
          />
          <Input.Password
            maxLength={6}
            inputMode="numeric"
            size="large"
            placeholder="Confirm New PIN"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
          />
          <Row style={{ display: "flex", flexDirection: "row" }}>
            <Button
              type="primary"
              onClick={savePin}
              disabled={!Object.values(pinErrors).every(Boolean)}
              style={{ marginRight: 10 }}
            >
              Save PIN
            </Button>
            <Button type="default" onClick={resetAll}>
              <ClearOutlined />
            </Button>
          </Row>
        </>
      )}

      {/* --- Forgot PIN flow --- */}
      {forgotPinMode && !otpSent && (
        <>
          <Input.Password
            size="large"
            placeholder="Enter your account password"
            value={passwordForPin}
            onChange={(e) => setPasswordForPin(e.target.value)}
          />
          <Button
            type="primary"
            onClick={requestOtpForPin}
            disabled={!passwordForPin}
          >
            Send OTP
          </Button>
        </>
      )}

      {forgotPinMode && otpSent && !otpVerified && (
        <>
          <Input
            size="large"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <Button type="primary" onClick={verifyOtp} disabled={!otp}>
            Verify OTP
          </Button>
        </>
      )}

      {forgotPinMode && otpVerified && (
        <>
          <Input.Password
            maxLength={6}
            inputMode="numeric"
            size="large"
            placeholder="New PIN"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
          />
          <Input.Password
            maxLength={6}
            inputMode="numeric"
            size="large"
            placeholder="Confirm New PIN"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
          />
          <Row style={{ display: "flex", flexDirection: "row" }}>
            <Button
              type="primary"
              onClick={savePin}
              disabled={!Object.values(pinErrors).every(Boolean)}
            >
              Save PIN
            </Button>
            <Button type="default" onClick={resetAll}>
              <ClearOutlined />
            </Button>
          </Row>
        </>
      )}
    </Space>
  );

  return (
    <Row>
      <Tabs
        items={[
          { key: "1", label: "Password", children: PasswordTab },
          { key: "2", label: "PIN", children: PinTab },
        ]}
      />
    </Row>
  );
}
