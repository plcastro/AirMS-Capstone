import React, { useState, useEffect } from "react";
import "./login.css";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { API_BASE } from "../../utils/API_BASE";
import { Button } from "antd";

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const token = query.get("token");

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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

  const getRequirementStyle = (met) => ({
    color: met ? "#26866F" : "#999",
    fontSize: "12px",
    marginRight: "5px",
  });

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setError("");
    setMessage("");
  };

  const validatePasswords = () => {
    if (!formData.newPassword || !formData.confirmPassword) {
      setError("Please fill in all fields.");
      return false;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }
    if (
      !passwordRequirements.minLength ||
      !passwordRequirements.hasUppercase ||
      !passwordRequirements.hasNumber
    ) {
      setError("Password does not meet requirements.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validatePasswords()) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/user/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: formData.newPassword }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage("Password reset successfully! Redirecting to login...");
        setTimeout(() => navigate("/login"), 3000);
      } else {
        setError(data.message || "Failed to reset password.");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-content">
          <h1 className="title">Invalid Reset Link</h1>
          <p className="subtitle">
            This password reset link is invalid or has expired.
          </p>
          <div className="signup-link">
            <Link to="/forgot">Request a new reset link</Link> or{" "}
            <Link to="/login">Return to login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-container">
      <div className="reset-password-content">
        <h1 className="title">Reset Password</h1>
        <p className="subtitle">Enter your new password</p>

        <form className="reset-password-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="password"
              placeholder="New Password"
              value={formData.newPassword}
              onChange={(e) => handleChange("newPassword", e.target.value)}
              minLength={8}
              required
            />
          </div>

          <div className="form-group">
            <input
              type="password"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
              minLength={8}
              required
            />
          </div>

          {/* Password requirements */}
          <div style={{ marginBottom: "15px" }}>
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

          <Button
            type="primary"
            className="login-btn"
            htmlType="submit"
            disabled={loading || !isFormValid}
          >
            {loading ? "Resetting..." : "RESET PASSWORD"}
          </Button>

          {error && <div className="error">{error}</div>}
          {message && <div className="info">{message}</div>}

          <div className="signup-link">
            <Link to="/login">Back to Login</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
