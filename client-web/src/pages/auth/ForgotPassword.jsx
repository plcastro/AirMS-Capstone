import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import {
  Input,
  Button,
  Card,
  message as Antmessage,
  Form,
  Typography,
  Row,
  Col,
} from "antd";
import "./login.css";
import { API_BASE } from "../../utils/API_BASE";
const { Title, Text } = Typography;
export default function ForgotPassword() {
  const nav = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const isEmailValid = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value.trim());
  };

  const handleEmailBlur = () => {
    setTouched(true);

    if (!email.trim()) {
      setMessage("Email is required.");
      return;
    }

    if (!isEmailValid(email)) {
      setMessage("Please enter a valid email address.");
      return;
    }

    setMessage("");
  };

  const sendResetLink = async (e) => {
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
        Antmessage.success(
          "Password reset email sent. Redirecting to OTP verification...",
        );
        setTimeout(
          () => nav("/verification", { state: { token: data.token, email } }),
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
    <Card className="login-container">
      <Row justify="center" style={{ marginBottom: 20 }}>
        <Col span={24} style={{ textAlign: "center" }}>
          <Title level={2}>Forgot Password</Title>
          <Text>Please provide your email to proceed</Text>
        </Col>
      </Row>

      <Form
        layout="vertical"
        className="forgot-password-form"
        onFinish={sendResetLink}
      >
        <Form.Item label="Email" required>
          <Input
            type="email"
            id="email"
            placeholder="Enter email"
            inputMode="email"
            onBlur={handleEmailBlur}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={254}
            size="large"
            allowClear
            required
          />
          <Row style={{ marginBottom: 10 }}>
            {message && <Text type="danger">{message}</Text>}
          </Row>
          <Button
            htmlType="submit"
            type="primary"
            size="large"
            className="login-btn"
            disabled={loading}
          >
            {loading ? "SENDING..." : "SEND RESET INSTRUCTIONS"}
          </Button>

          <div className="signup-link" style={{ marginTop: "20px" }}>
            Remembered your password? <Link to="/login">Log in</Link>
          </div>
        </Form.Item>
      </Form>
    </Card>
  );
}
