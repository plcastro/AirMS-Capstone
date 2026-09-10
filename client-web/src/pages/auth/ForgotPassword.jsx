import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { Input, Button, Form, Typography, Row } from "antd";
import "./login.css";
import { API_BASE } from "../../utils/API_BASE";
const { Text } = Typography;
import LoginLayout from "../../components/layout/LoginLayout";
import ResultPopup from "../../components/common/ResultPopup";

export default function ForgotPassword() {
  const nav = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState({
    open: false,
    status: "success",
    title: "",
    subTitle: "",
  });

  const isEmailValid = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value.trim());
  };

  const handleEmailBlur = () => {
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

  const sendResetLink = async () => {
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
        setPopup({
          open: true,
          status: "success",
          title: "Reset Link Sent",
          subTitle:
            data.message ||
            "Password reset email sent. Redirecting to OTP verification...",
        });
        setTimeout(
          () => nav("/verification", { state: { token: data.token, email } }),
          1000,
        );
      } else {
        setMessage("The email you entered does not correspond to any account.");
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      setMessage("Failed to send reset link. Try again later.");
    }
  };

  return (
    <>
      <LoginLayout
        title="Forgot Password"
        subtitle="Please provide your email to proceed"
      >
        <Form
          layout="vertical"
          className="forgot-password-form"
          onFinish={sendResetLink}
        >
          <Form.Item label="Email" required style={{ fontWeight: "bold" }}>
            <Input
              type="email"
              id="email"
              placeholder="Enter your email"
              inputMode="email"
              onBlur={handleEmailBlur}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={254}
              size="large"
              allowClear
            />
            <Row style={{ marginBottom: 10, fontWeight: "normal" }}>
              {message && <Text type="danger">{message}</Text>}
            </Row>
            <Button
              htmlType="submit"
              type="primary"
              size="large"
              className="login-btn"
              disabled={loading}
            >
              {loading ? "SENDING..." : "CONTINUE"}
            </Button>
          </Form.Item>
          <div style={{ marginTop: "20px" }}>
            Remembered your password?{" "}
            <Link to="/login" className="link">
              Log in
            </Link>
          </div>
        </Form>
      </LoginLayout>
      <ResultPopup
        open={popup.open}
        status={popup.status}
        title={popup.title}
        subTitle={popup.subTitle}
        onClose={() => setPopup((prev) => ({ ...prev, open: false }))}
      />
    </>
  );
}
