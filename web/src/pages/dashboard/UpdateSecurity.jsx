import React, { useState, useEffect, useContext } from "react";
import { Row, Space, Input, Button, Typography, Tabs, message } from "antd";
import { AuthContext } from "../../context/AuthContext";
import { API_BASE } from "../../utils/API_BASE";

const { Text } = Typography;

export default function UpdateSecurity() {
  const { user, setUser } = useContext(AuthContext);

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
  const [resetToken, setResetToken] = useState("");

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

  const resetAll = () => {
    setVerifyEmail("");
    setOtp("");
    setOtpSent(false);
    setOtpVerified(false);
    setResetToken("");
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

      message.success("Password updated!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      message.error(err.message);
    }
  };

  const requestPasswordOtp = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/user/request-password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifyEmail, id: user.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setResetToken(data.token);
      setOtpSent(true);
      message.success("OTP sent");
    } catch (err) {
      message.error(err.message);
    }
  };

  const verifyPasswordOtp = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/user/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, otp }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setOtpVerified(true);
      message.success("OTP verified");
    } catch (err) {
      message.error(err.message);
    }
  };

  const resetPassword = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/user/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      message.success("Password reset successful!");
      setForgotPasswordMode(false);
      resetAll();
    } catch (err) {
      message.error(err.message);
    }
  };

  const savePin = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/user/updatePIN/${user.id}`, {
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
      message.success("PIN updated!");
    } catch (err) {
      message.error(err.message);
    }
  };

  const requestPinOtp = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/user/request-pin-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifyEmail, id: user.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setResetToken(data.token);
      setOtpSent(true);
      message.success("OTP sent");
    } catch (err) {
      message.error(err.message);
    }
  };

  const verifyPinOtp = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/user/verify-pin-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, otp }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setOtpVerified(true);
      message.success("OTP verified");
    } catch (err) {
      message.error(err.message);
    }
  };

  const resetPin = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/user/reset-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, newPin }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setUser((prev) => ({ ...prev, pin: newPin }));
      message.success("PIN reset successful!");
      setForgotPinMode(false);
      resetAll();
    } catch (err) {
      message.error(err.message);
    }
  };

  const PasswordTab = (
    <Space orientation="vertical">
      {!forgotPasswordMode ? (
        <>
          <Input.Password
            size="large"
            placeholder="Current Password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />

          <Text
            style={{ color: "#1677ff", cursor: "pointer" }}
            onClick={() => setForgotPasswordMode(true)}
          >
            Forgot Password?
          </Text>

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

          <Text
            type={
              Object.values(passwordErrors).every(Boolean)
                ? "success"
                : "secondary"
            }
          >
            Password should be at least 8 characters long, include 1 uppercase
            letter, 1 lowercase letter, and 1 number.
          </Text>
          <Button type="primary" onClick={savePassword}>
            Save Password
          </Button>
        </>
      ) : (
        <>
          {!otpSent ? (
            <>
              <Input
                placeholder="Enter Email"
                value={verifyEmail}
                onChange={(e) => setVerifyEmail(e.target.value)}
              />
              <Button onClick={requestPasswordOtp}>Send OTP</Button>
            </>
          ) : !otpVerified ? (
            <>
              <Input
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              <Button onClick={verifyPasswordOtp}>Verify OTP</Button>
            </>
          ) : (
            <>
              <Input.Password
                size="large"
                placeholder="New Password"
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Input.Password
                size="large"
                placeholder="Confirm Password"
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <Button onClick={resetPassword}>Reset Password</Button>
            </>
          )}

          <Button onClick={() => setForgotPasswordMode(false)}>Back</Button>
        </>
      )}
    </Space>
  );

  const PinTab = (
    <Space orientation="vertical">
      {!forgotPinMode ? (
        <>
          <Input.Password
            size="large"
            placeholder="Current PIN"
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value)}
          />

          <Text
            style={{ color: "#1677ff", cursor: "pointer" }}
            onClick={() => setForgotPinMode(true)}
          >
            Forgot PIN?
          </Text>

          <Input.Password
            size="large"
            placeholder="New PIN"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
          />
          <Input.Password
            size="large"
            placeholder="Confirm PIN"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
          />

          <Button type="primary" onClick={savePin}>
            Save PIN
          </Button>
        </>
      ) : (
        <>
          {!otpSent ? (
            <>
              <Input
                placeholder="Enter Email"
                value={verifyEmail}
                onChange={(e) => setVerifyEmail(e.target.value)}
              />
              <Button onClick={requestPinOtp}>Send OTP</Button>
            </>
          ) : !otpVerified ? (
            <>
              <Input
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              <Button onClick={verifyPinOtp}>Verify OTP</Button>
            </>
          ) : (
            <>
              <Input.Password
                placeholder="New PIN"
                onChange={(e) => setNewPin(e.target.value)}
              />
              <Input.Password
                placeholder="Confirm PIN"
                onChange={(e) => setConfirmPin(e.target.value)}
              />
              <Button onClick={resetPin}>Reset PIN</Button>
            </>
          )}

          <Button onClick={() => setForgotPinMode(false)}>Back</Button>
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
