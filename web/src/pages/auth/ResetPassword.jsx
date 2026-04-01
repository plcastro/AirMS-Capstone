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

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setMessage("");
  };

  // Real-time validation
  useEffect(() => {
    const { newPassword, confirmPassword } = formData;

    if (!newPassword && !confirmPassword) {
      setError("");
      return;
    }

    const validLength = newPassword.length >= 8;
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);

    if (!validLength || !hasUppercase || !hasNumber) {
      setError(
        "Password must be at least 8 characters, contain an uppercase letter, and include a number.",
      );
    } else if (confirmPassword && newPassword !== confirmPassword) {
      setError("Passwords do not match.");
    } else {
      setError("");
    }
  }, [formData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (error) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/user/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: formData.newPassword }),
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
              required
            />
          </div>

          <div className="form-group">
            <input
              type="password"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
              required
            />
          </div>

          <Button
            type="primary"
            className="login-btn"
            htmlType="submit"
            disabled={loading || !!error}
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
