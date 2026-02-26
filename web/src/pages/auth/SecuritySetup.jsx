import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { API_BASE } from "../../utilities/API_BASE";
import "./login.css";
import { Input } from "antd";
const SecuritySetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = location.state || {}; // equivalent to route.params in React Native

  const email = params.email || "";
  const token = params.setupToken || "";

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasUppercase: false,
    hasNumber: false,
  });
  const [message, setMessage] = useState("");
  const [setupSuccess, setSetupSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const changeHandler = (key, value) => {
    setFormData({ ...formData, [key]: value });

    if (key === "newPassword") {
      setPasswordRequirements({
        minLength: value.length >= 8,
        hasUppercase: /[A-Z]/.test(value),
        hasNumber: /\d/.test(value),
      });
    }
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
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <p style={{ fontSize: "12px", color: "#666", marginBottom: "5px" }}>
              Password Requirements:
            </p>
            <div>
              <span style={getRequirementStyle(passwordRequirements.minLength)}>
                ✓
              </span>
              <span>At least 8 characters</span>
            </div>
            <div>
              <span
                style={getRequirementStyle(passwordRequirements.hasUppercase)}
              >
                ✓
              </span>
              <span>One uppercase letter</span>
            </div>
            <div>
              <span style={getRequirementStyle(passwordRequirements.hasNumber)}>
                ✓
              </span>
              <span>One number</span>
            </div>
          </div>

          {message && !setupSuccess && <div className="error">{message}</div>}

          <button type="submit" className="login-btn">
            SET PASSWORD
          </button>

          <div style={{ marginTop: "15px" }}>
            <button
              type="button"
              className="recovery-btn"
              onClick={handleResendActivation}
              disabled={resendLoading}
            >
              {resendLoading ? "SENDING..." : "RESEND ACTIVATION LINK"}
            </button>
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
