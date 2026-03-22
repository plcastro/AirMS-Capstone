// WEB
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Input, Button } from "antd";
import "./login.css";
import { API_BASE } from "../../utils/API_BASE";

export default function ForgotPassword() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isEmailValid = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value.trim());
  };

  const isFormValid = isEmailValid(email);

  const sendResetLink = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!isEmailValid(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/api/user/request-password-reset`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      );

      const data = await response.json();
      setLoading(false);

      if (response.ok) {
        setMessage("Password reset email sent. Redirecting to OTP screen...");

        // Redirect to OTP screen with token
        setTimeout(
          () => nav("/otp", { state: { token: data.token, email } }),
          2500,
        );
      } else {
        setError(data.message || "Failed to send reset link. Try again later.");
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      setError("Failed to send reset link. Try again later.");
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-content">
        <h1 className="title">Forgot Password</h1>
        <p className="subtitle">Please provide your email to proceed</p>

        <form className="forgot-password-form" onSubmit={sendResetLink}>
          <div className="form-group">
            <Input
              type="email"
              id="email"
              placeholder="Enter email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ marginBottom: 30 }}
              maxLength={254}
            />
            <Button
              htmlType="submit"
              type="primary"
              className="login-btn"
              disabled={!isFormValid || loading}
            >
              {loading ? "Sending..." : "EMAIL ME A RECOVERY LINK"}
            </Button>

            {error && <div className="error">{error}</div>}
            {message && <div className="info">{message}</div>}

            <div className="signup-link" style={{ marginTop: "20px" }}>
              Remembered your password? <Link to="/login">Log in</Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
