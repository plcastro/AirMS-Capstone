import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./login.css";
import { Input, Button } from "antd";
import { API_BASE } from "../../utils/API_BASE";
const SecuritySetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const email = query.get("email");
  const token = query.get("setupToken");

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [setupSuccess, setSetupSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const passwordRequirements = {
    minLength: formData.newPassword.length >= 8,
    hasUppercase: /[A-Z]/.test(formData.newPassword),
    hasNumber: /\d/.test(formData.newPassword),
  };
  const isFormValid =
    passwordRequirements.minLength &&
    passwordRequirements.hasUppercase &&
    passwordRequirements.hasNumber &&
    formData.confirmPassword &&
    formData.newPassword === formData.confirmPassword;

  const changeHandler = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const validate = () => {
    const { newPassword, confirmPassword } = formData;

    if (!newPassword.trim() || !confirmPassword.trim()) {
      return setMessage("Please fill all fields.");
    }
    if (!passwordRequirements.minLength)
      return setMessage("Password must be at least 8 characters.");
    if (!passwordRequirements.hasUppercase)
      return setMessage("Password must contain an uppercase letter.");
    if (!passwordRequirements.hasNumber)
      return setMessage("Password must contain a number.");
    if (newPassword !== confirmPassword)
      return setMessage("Passwords do not match.");

    setMessage("");
    handleSetup();
  };

  const handleSetup = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/user/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword: formData.newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSetupSuccess(true);
        setMessage("Password set successfully! Redirecting to login...");
        setTimeout(() => navigate("/login"), 2500);
      } else {
        setMessage(data.message || "Failed to activate account.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Failed to activate account. Try again later.");
    }
  };

  const handleResendActivation = async () => {
    if (!email) return;

    setResendLoading(true);
    setResendMessage("");

    try {
      const res = await fetch(`${API_BASE}/api/user/resend-activation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setResendMessage(data.message || "Activation link sent!");
      } else {
        setResendMessage(data.message || "Failed to resend activation link.");
      }
    } catch (err) {
      console.error(err);
      setResendMessage("Failed to resend activation link. Try again later.");
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
    <div className="login-container">
      <div className="login-content">
        <h1 className="title">Security Setup</h1>
        <p className="subtitle">Set your new password to proceed</p>

        <form
          className="login-form"
          onSubmit={(e) => {
            e.preventDefault();
            validate();
          }}
        >
          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <Input
              type="password"
              id="newPassword"
              placeholder="Enter new password"
              value={formData.newPassword}
              onChange={(e) => changeHandler("newPassword", e.target.value)}
              required
              minLength={8}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <Input
              type="password"
              id="confirmPassword"
              placeholder="Confirm new password"
              value={formData.confirmPassword}
              onChange={(e) => changeHandler("confirmPassword", e.target.value)}
              required
              minLength={8}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <p style={{ fontSize: "12px", color: "#666", marginBottom: "5px" }}>
              Create a password that meets the following requirements:
            </p>
            <div>
              <span style={getRequirementStyle(passwordRequirements.minLength)}>
                ✓ At least 8 characters
              </span>
            </div>
            <div>
              <span
                style={getRequirementStyle(passwordRequirements.hasUppercase)}
              >
                ✓ One uppercase letter
              </span>
            </div>
            <div>
              <span style={getRequirementStyle(passwordRequirements.hasNumber)}>
                ✓ One number
              </span>
            </div>
          </div>

          {message && !setupSuccess && <div className="error">{message}</div>}

          <Button
            type="primary"
            className="login-btn"
            disabled={!isFormValid}
            htmlType="submit"
          >
            SET PASSWORD
          </Button>

          <div style={{ marginTop: "10px" }}>
            <Button
              type="default"
              className="recovery-btn"
              onClick={handleResendActivation}
              disabled={resendLoading}
            >
              {resendLoading ? "SENDING..." : "RESEND ACTIVATION LINK"}
            </Button>
            {resendMessage && (
              <div
                style={{ fontSize: "12px", color: "#8f8e8e", marginTop: "5px" }}
              >
                {resendMessage}
              </div>
            )}
          </div>

          <div style={{ marginTop: "20px" }}>
            Already activated? <Link to="/login">Go to Login</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SecuritySetup;
