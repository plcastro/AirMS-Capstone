import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Form, Input, Button, Card, message as antMessage } from "antd";
import { API_BASE } from "../../utils/API_BASE";
import "./login.css";

const SecuritySetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const email = query.get("email") || "";
  const token = query.get("setupToken") || "";

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
    pin: "",
    confirmPin: "",
  });
  const [, setSetupSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const passwordRequirements = {
    minLength: formData.newPassword.length >= 8,
    hasUppercase: /[A-Z]/.test(formData.newPassword),
    hasNumber: /\d/.test(formData.newPassword),
  };

  const pinRequirements = {
    isSixDigits: /^\d{6}$/.test(formData.pin),
    match: formData.pin === formData.confirmPin,
  };

  const isFormValid =
    passwordRequirements.minLength &&
    passwordRequirements.hasUppercase &&
    passwordRequirements.hasNumber &&
    formData.newPassword === formData.confirmPassword &&
    pinRequirements.isSixDigits &&
    pinRequirements.match;

  const changeHandler = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const validateAndSubmit = async () => {
    // Password checks
    if (!passwordRequirements.minLength) {
      return antMessage.error("Password must be at least 8 characters.");
    }
    if (!passwordRequirements.hasUppercase) {
      return antMessage.error("Password must contain an uppercase letter.");
    }
    if (!passwordRequirements.hasNumber) {
      return antMessage.error("Password must contain a number.");
    }
    if (formData.newPassword !== formData.confirmPassword) {
      return antMessage.error("Passwords do not match.");
    }

    // PIN checks
    if (!pinRequirements.isSixDigits) {
      return antMessage.error("PIN must be exactly 6 digits.");
    }
    if (!pinRequirements.match) {
      return antMessage.error("PINs do not match.");
    }

    // Submit
    try {
      const res = await fetch(`${API_BASE}/api/user/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword: formData.newPassword,
          pin: formData.pin,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSetupSuccess(false);
        throw new Error(data.message || "Activation failed");
      }
      setSetupSuccess(true);
      antMessage.success(
        "Password and PIN set successfully! Redirecting to login...",
      );
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      console.error(err);
      antMessage.error(err.message || "Activation failed. Try again later.");
    }
  };

  const handleResendActivation = async () => {
    if (!email)
      return antMessage.error(
        "No email provided for resending activation link.",
      );

    setResendLoading(true);
    antMessage.destroy(); // Clear previous messages

    try {
      const res = await fetch(`${API_BASE}/api/user/resend-activation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        antMessage.success(data.message || "Activation link sent!");
      } else {
        antMessage.error(data.message || "Failed to resend activation link.");
      }
    } catch (err) {
      console.error(err);
      antMessage.error("Failed to resend activation link. Try again later.");
    } finally {
      setResendLoading(false);
    }
  };

  const getRequirementStyle = (met) => ({
    color: met ? "#26866F" : "#999",
    fontSize: "12px",
    marginRight: "5px",
  });

  return (
    <Card style={{ margin: "20px 0" }}>
      <div className="login-content">
        <h1 className="title">Security Setup</h1>
        <p className="subtitle">Set your new password and PIN to proceed</p>

        <Form layout="vertical" onFinish={validateAndSubmit}>
          <Form.Item label="New Password" required>
            <Input.Password
              value={formData.newPassword}
              onChange={(e) => changeHandler("newPassword", e.target.value)}
            />
          </Form.Item>

          <Form.Item label="Confirm Password" required>
            <Input.Password
              value={formData.confirmPassword}
              onChange={(e) => changeHandler("confirmPassword", e.target.value)}
            />
          </Form.Item>

          {/* Live password requirements */}
          <div style={{ marginBottom: "15px" }}>
            <span style={getRequirementStyle(passwordRequirements.minLength)}>
              {passwordRequirements.minLength ? "✓" : "✗"} At least 8 characters
            </span>
            <br />
            <span
              style={getRequirementStyle(passwordRequirements.hasUppercase)}
            >
              {passwordRequirements.hasUppercase ? "✓" : "✗"} One uppercase
              letter
            </span>
            <br />
            <span style={getRequirementStyle(passwordRequirements.hasNumber)}>
              {passwordRequirements.hasNumber ? "✓" : "✗"} One number
            </span>
          </div>

          {/* PIN */}
          <Form.Item label="Set 6-digit PIN" required>
            <Input.Password
              value={formData.pin}
              inputMode="numeric"
              maxLength={6}
              onChange={(e) =>
                changeHandler("pin", e.target.value.replace(/\D/g, ""))
              }
              placeholder="Enter 6-digit PIN"
            />
          </Form.Item>

          <Form.Item label="Confirm PIN" required>
            <Input.Password
              value={formData.confirmPin}
              maxLength={6}
              inputMode="numeric"
              onChange={(e) =>
                changeHandler("confirmPin", e.target.value.replace(/\D/g, ""))
              }
              placeholder="Confirm 6-digit PIN"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              disabled={!isFormValid}
              block
            >
              SET PASSWORD & PIN
            </Button>
          </Form.Item>

          <Form.Item>
            <Button
              type="default"
              onClick={handleResendActivation}
              loading={resendLoading}
              block
            >
              RESEND ACTIVATION LINK
            </Button>
          </Form.Item>

          <div style={{ marginTop: "20px" }}>
            Already activated? <Link to="/login">Go to Login</Link>
          </div>
        </Form>
      </div>
    </Card>
  );
};

export default SecuritySetup;
