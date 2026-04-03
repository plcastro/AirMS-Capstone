import { useState, useEffect } from "react";
import "./login.css";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { API_BASE } from "../../utils/API_BASE";
import { Button, Input, Card, Typography, Row, Col, Form, message } from "antd";
const { Title, Text } = Typography;

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
  const [loading, setLoading] = useState(false);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setError("");
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
        message.success("Password reset successfully! Redirecting to login...");
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
      <Card className="reset-password-container">
        <Row></Row>
        <Title level={2}>Invalid Reset Link</Title>
        <Text type="danger">
          This password reset link is invalid or has expired.
        </Text>
        <div className="signup-link">
          <Link to="/forgot">Request a new reset link</Link> or{" "}
          <Link to="/login">Return to login</Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="reset-password-container">
      <Row align={"middle"} justify={"center"} style={{ marginBottom: 20 }}>
        <Col span={24} style={{ textAlign: "center" }}>
          <Title level={2}>Reset Password</Title>
        </Col>
        <Col span={24} style={{ textAlign: "center" }}>
          <Text>Enter your new password</Text>
        </Col>
      </Row>

      <Form
        layout="vertical"
        className="reset-password-form"
        onSubmit={handleSubmit}
      >
        <Form.Item label="New Password" required>
          <Input.Password
            placeholder="New Password"
            size="large"
            value={formData.newPassword}
            onChange={(e) => handleChange("newPassword", e.target.value)}
            required
            allowClear
          />
        </Form.Item>

        <Form.Item label="Confirm Password" required>
          <Input.Password
            size="large"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={(e) => handleChange("confirmPassword", e.target.value)}
            required
            allowClear
          />
        </Form.Item>

        <Row align={"middle"} justify={"center"} style={{ gap: 10 }}>
          <Col span={24}>{error && <div className="error">{error}</div>}</Col>
          <Col span={24}>
            <Button
              type="primary"
              size="large"
              className="login-btn"
              htmlType="submit"
              disabled={
                loading ||
                !!error ||
                !formData.newPassword ||
                !formData.confirmPassword
              }
            >
              {loading ? "Resetting..." : "RESET PASSWORD"}
            </Button>
          </Col>
          <Col span={24}>
            <Button
              type="default"
              size="large"
              htmlType="button"
              onClick={() => navigate("/login")}
              style={{ width: "100%" }}
            >
              {loading ? "GOING TO LOGIN..." : "GO BACK TO LOGIN"}
            </Button>
          </Col>
        </Row>
      </Form>
    </Card>
  );
};

export default ResetPassword;
