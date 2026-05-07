import { useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import "./login.css";
import {
  App,
  Input,
  Checkbox,
  Button,
  Typography,
  Row,
  Col,
  Form,
} from "antd";
import { API_BASE } from "../../utils/API_BASE";
import { AuthContext } from "../../context/AuthContext";
import LoginLayout from "../../components/layout/LoginLayout";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import AirMSLogo from "../../assets/AirMS_web.png";
const { Text } = Typography;

const Login = () => {
  const { message } = App.useApp();
  const { loginUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Load saved credentials on component mount
  useEffect(() => {
    const savedIdentifier = localStorage.getItem("rememberedIdentifier");
    const savedRememberMe = localStorage.getItem("rememberMe") === "true";

    if (savedRememberMe && savedIdentifier) {
      setFormData({
        identifier: savedIdentifier,
        password: "",
      });
      setRememberMe(true);
    }
  }, []);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [id]: value,
    }));
  };

  const handleRememberMeChange = (e) => {
    const isChecked = e.target.checked;
    setRememberMe(isChecked);

    if (!isChecked) {
      localStorage.setItem("rememberMe", "false");
      localStorage.removeItem("rememberedIdentifier");
    } else {
      localStorage.setItem("rememberMe", "true");
    }
  };

  const handleSubmit = async (e) => {
    setError("");

    const identifier = formData.identifier?.trim();
    const password = formData.password?.trim();

    if (!identifier || !password) {
      setError("Username/email and password are required");
      return;
    }
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/user/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          password,
          client: "web",
          rememberMe,
        }),
        credentials: "include",
      });

      const contentType = response.headers.get("content-type") || "";
      const isJsonResponse = contentType.includes("application/json");
      const data = isJsonResponse
        ? await response.json()
        : { message: (await response.text()) || "Login failed" };

      if (response.ok) {
        if (data.requireSetup) {
          navigate(
            `/security-setup?setupToken=${encodeURIComponent(data.user.setupToken)}&email=${encodeURIComponent(data.user.email)}`,
          );
          return;
        }
        await loginUser(data.user, data.token, { rememberMe });

        if (rememberMe) {
          localStorage.setItem(
            "rememberedIdentifier",
            formData.identifier.trim(),
          );

          localStorage.setItem("rememberMe", "true");
        } else {
          localStorage.removeItem("rememberedIdentifier");
          localStorage.removeItem("rememberMe");
        }
        message.success("Logged in successfully!");
        handleNavigate(data.user);
      } else {
        if (response.status === 429) {
          setError(
            data.message ||
              "Too many login attempts. Please wait a few minutes and try again.",
          );
        } else {
          setError(data.message || "Login failed");
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (loggedInUser) => {
    const pos = loggedInUser?.jobTitle?.toLowerCase() || "";

    switch (pos) {
      case "admin":
        navigate("/dashboard/user-management/view-users");
        break;
      case "mechanic":
        navigate("/dashboard/maintenance-log");
        break;
      case "maintenance manager":
        navigate("/dashboard/maintenance-dashboard");
        break;
      case "officer-in-charge":
        navigate("/dashboard/maintenance-dashboard");
        break;
      case "warehouse department":
        navigate("/dashboard/parts-requisition");
        break;
      default:
        navigate("/dashboard/profile");
        break;
    }
  };
  return (
    <>
      {loading && (
        <div
          className="login-loading-overlay"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="login-loading-card">
            <img src={AirMSLogo} alt="AirMS" className="login-loading-logo" />
            <div className="login-loading-spinner" />
            <p className="login-loading-title">Signing You In</p>
            <p className="login-loading-subtitle">
              Verifying your account and preparing your workspace.
            </p>
          </div>
        </div>
      )}

      <LoginLayout>
        <Form
          layout="vertical"
          onFinish={handleSubmit}
          className="login-form-modern"
        >
          <Form.Item label="Username or Email" required>
            <Input
              type="text"
              id="identifier"
              size="large"
              placeholder="Enter username or email"
              value={formData.identifier}
              onChange={handleInputChange}
              autoComplete="username"
              required
              allowClear
              prefix={<UserOutlined />}
            />
          </Form.Item>

          <Form.Item label="Password" required>
            <Input.Password
              id="password"
              placeholder="Enter password"
              size="large"
              value={formData.password}
              onChange={handleInputChange}
              autoComplete="current-password"
              required
              allowClear
              prefix={<LockOutlined />}
            />
            {error && <Text type="danger">{error}</Text>}
          </Form.Item>

          <Row className="login-form-meta">
            <Col xs={24} sm={12}>
              <Checkbox
                id="remember"
                checked={rememberMe}
                onChange={handleRememberMeChange}
              >
                Remember Me
              </Checkbox>
            </Col>
            <Col xs={24} sm={12} className="login-forgot-col">
              <Link to="/forgot" className="link">
                Forgot password?
              </Link>
            </Col>
          </Row>

          <Button
            htmlType="submit"
            type="primary"
            className="login-btn"
            disabled={loading}
            size="large"
          >
            {loading ? "PLEASE WAIT..." : "LOGIN"}
          </Button>
        </Form>
      </LoginLayout>
    </>
  );
};

export default Login;
