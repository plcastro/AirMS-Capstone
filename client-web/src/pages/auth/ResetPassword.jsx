import { useState, useEffect } from "react";
import "./login.css";
import { useNavigate, useLocation } from "react-router-dom";
import { API_BASE } from "../../utils/API_BASE";
import { Button, Input, Typography, Row, Col, Form, Spin } from "antd";
import {
  CloseCircleOutlined,
  LoginOutlined,
  MailOutlined,
} from "@ant-design/icons";
import LoginLayout from "../../components/layout/LoginLayout";
import ResultPopup from "../../components/common/ResultPopup";
const { Text } = Typography;

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
  const [redirecting, setRedirecting] = useState(false);
  const [popup, setPopup] = useState({
    open: false,
    status: "success",
    title: "",
    subTitle: "",
  });

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

  const handleSubmit = async () => {
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
        setRedirecting(true);
        setPopup({
          open: true,
          status: "success",
          title: "Password reset successful",
          subTitle:
            data.message ||
            "Password has been reset successfully. Taking you to login...",
        });
        setTimeout(() => navigate("/login"), 1600);
      } else {
        setPopup({
          open: true,
          status: "error",
          title: "Password Reset Failed",
          subTitle: data.message || "Failed to reset password.",
        });
      }
    } catch (err) {
      console.error(err);
      setPopup({
        open: true,
        status: "error",
        title: "Password Reset Failed",
        subTitle: "Password reset failed. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <LoginLayout
        title="Invalid Reset Link"
        subtitle="This password reset link is invalid or has expired."
      >
        <div className="invalid-reset-state">
          <div className="invalid-reset-icon" aria-hidden="true">
            <CloseCircleOutlined />
          </div>
          <Text className="invalid-reset-message">
            Request a new password reset link to continue. For your account
            security, old or incomplete links cannot be used.
          </Text>
          <Row gutter={[12, 12]} className="invalid-reset-actions">
            <Col xs={24} sm={12}>
              <Button
                type="primary"
                size="large"
                icon={<MailOutlined />}
                className="login-btn"
                onClick={() => navigate("/forgot")}
              >
                REQUEST NEW LINK
              </Button>
            </Col>
            <Col xs={24} sm={12}>
              <Button
                size="large"
                icon={<LoginOutlined />}
                className="invalid-reset-secondary-btn"
                onClick={() => navigate("/login")}
              >
                BACK TO LOGIN
              </Button>
            </Col>
          </Row>
        </div>
      </LoginLayout>
    );
  }

  return (
    <>
      <LoginLayout title="Reset Password" subtitle="Enter your new password">
        <Form
          layout="vertical"
          className="reset-password-form"
          onFinish={handleSubmit}
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
              {redirecting && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginBottom: 12,
                  }}
                >
                  <Spin size="small" />
                </div>
              )}
              <Button
                type="primary"
                size="large"
                className="login-btn"
                htmlType="submit"
                disabled={
                  loading ||
                  redirecting ||
                  !!error ||
                  !formData.newPassword ||
                  !formData.confirmPassword
                }
              >
                {redirecting
                  ? "REDIRECTING..."
                  : loading
                    ? "RESETTING..."
                    : "RESET PASSWORD"}
              </Button>
            </Col>
            <Col span={24}>
              <Button
                type="default"
                size="large"
                htmlType="button"
                onClick={() => navigate("/login")}
                disabled={redirecting}
                style={{ width: "100%" }}
              >
                {redirecting ? "GOING TO LOGIN..." : "GO BACK TO LOGIN"}
              </Button>
            </Col>
          </Row>
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
};

export default ResetPassword;
