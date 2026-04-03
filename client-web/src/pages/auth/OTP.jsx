// WEB
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button, message, Input, Card, Typography, Row } from "antd";
import { API_BASE } from "../../utils/API_BASE";

import "./login.css";
import "../../App.css";
const { Title, Text } = Typography;

export default function OTP() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = location.state || {};
  const token = params.token;
  const email = params.email;

  const [code, setCode] = useState("");
  const [pinReady, setPinReady] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const MAX_CODE_LENGTH = 6;

  // Countdown timer for resend button
  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  useEffect(() => {
    setPinReady(code.length === MAX_CODE_LENGTH);
  }, [code]);

  const handleVerify = async () => {
    if (!pinReady) return;

    if (!token) {
      message.error("Missing verification token.");
      return;
    }

    try {
      setConfirmLoading(true);
      const res = await fetch(`${API_BASE}/api/user/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, otp: code }),
      });

      const data = await res.json();
      setConfirmLoading(false);

      if (res.ok) {
        message.success("OTP verified. Redirecting...");
        navigate(`/reset-password?token=${token}`);
      } else {
        message.error(data.message || "Invalid OTP");
      }
    } catch (err) {
      console.error("OTP verification error:", err);
      setConfirmLoading(false);
      message.error("Failed to verify OTP. Try again.");
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;

    if (!email) {
      message.error("Email not available to resend OTP.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/user/request-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok) {
        message.success("OTP resent to your email.");
        setResendTimer(60);
      } else {
        message.error(data.message || "Failed to resend OTP.");
      }
    } catch (err) {
      console.error("Resend OTP error:", err);
      message.error("Failed to resend OTP. Try again.");
    }
  };

  return (
    <Card className="login-container">
      <Row align={"middle"} justify={"center"} style={{ marginBottom: 20 }}>
        <Title level={2}>Account Verification</Title>
        <Text>
          Please enter the 6-digit code sent to {email || "your email"}
        </Text>
        <Input.OTP
          value={code}
          onChange={setCode}
          autoFocus
          style={{ marginTop: 20, fontSize: 24, letterSpacing: 12 }}
          length={6}
          formatter={(str) => str.replace(/\D/g, "")}
        />
      </Row>

      <Button
        type="primary"
        size="large"
        onClick={handleVerify}
        disabled={!pinReady}
        loading={confirmLoading}
        style={{ width: "100%", marginBottom: 10 }}
        className="primary-btn"
      >
        Verify
      </Button>
      <Button
        type="default"
        size="large"
        onClick={handleResend}
        disabled={resendTimer > 0}
        style={{ width: "100%" }}
      >
        {resendTimer > 0 ? `Resend code (${resendTimer}s)` : "Resend code"}
      </Button>
    </Card>
  );
}
