import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Input,
  Button,
  Card,
  message as Antmessage,
  Form,
  Typography,
} from "antd";
import "./login.css";
import { API_BASE } from "../../utils/API_BASE";
const { Title, Text } = Typography;
export default function ForgotPassword() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const isEmailValid = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value.trim());
  };

  const isFormValid = isEmailValid(email);

  const sendResetLink = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setMessage("Email is required.");
      return;
    }
    if (!isEmailValid(email)) {
      setMessage("Please enter a valid email address.");
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
        setMessage("Redirecting to OTP...");
        Antmessage.success("Password reset email sent.");
        setTimeout(
          () => nav("/otp", { state: { token: data.token, email } }),
          2500,
        );
      } else {
        setMessage(
          data.message || "Failed to send reset link. Try again later.",
        );
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      setMessage("Failed to send reset link. Try again later.");
    }
  };

  return (
    <Card className="forgot-password-container">
      <Title level={2}>Forgot Password</Title>
      <Text>Please provide your email to proceed</Text>

      <Form className="forgot-password-form" onSubmit={sendResetLink}>
        <Form.Item label="Email" required>
          <Input
            type="email"
            id="email"
            placeholder="Enter email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ marginBottom: 30 }}
            maxLength={254}
            size="large"
            allowClear
            required
          />
          <Button
            htmlType="submit"
            type="primary"
            size="large"
            className="login-btn"
            disabled={!isFormValid || loading}
          >
            {loading ? "SENDING..." : "EMAIL ME A RECOVERY LINK"}
          </Button>

          {message && <div className="info">{message}</div>}

          <div className="signup-link" style={{ marginTop: "20px" }}>
            Remembered your password? <Link to="/login">Log in</Link>
          </div>
        </Form.Item>
      </Form>
    </Card>
  );
}
