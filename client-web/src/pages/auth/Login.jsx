import React, { useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import "./login.css";
import {
  Card,
  Input,
  Checkbox,
  Button,
  message as antMessage,
  Typography,
  Row,
  Col,
  Form,
} from "antd";
import { API_BASE } from "../../utils/API_BASE";
import { AuthContext } from "../../context/AuthContext";

const { Title, Text } = Typography;
const Login = () => {
  const { setUser } = useContext(AuthContext);
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
    const savedPassword = localStorage.getItem("rememberedPassword");
    const savedRememberMe = localStorage.getItem("rememberMe") === "true";

    if (savedRememberMe && savedIdentifier) {
      setFormData({
        identifier: savedIdentifier,
        password: savedPassword || "",
      });
      setRememberMe(true);
    }
  }, []);

  const isFormValid =
    formData.identifier.trim() !== "" && formData.password.trim() !== "";
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
      localStorage.setItem("rememberMe", "false"); // triggers other tabs
      localStorage.removeItem("rememberedIdentifier");
      localStorage.removeItem("rememberedPassword");
    } else {
      localStorage.setItem("rememberMe", "true");
    }
  };

  const handleSubmit = async (e) => {
    setError("");
    if (!formData.identifier.trim() || !formData.password.trim()) {
      setError("Username/email and password are required");
      return;
    }
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/user/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: formData.identifier.trim(),
          password: formData.password.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.requireSetup) {
          navigate(
            `/security-setup?setupToken=${encodeURIComponent(data.user.setupToken)}&email=${encodeURIComponent(data.user.email)}`,
          );
          return;
        }
        setUser(data.user);
        localStorage.setItem("token", data.token);
        localStorage.setItem("currentUser", JSON.stringify(data.user));

        if (rememberMe) {
          localStorage.setItem(
            "rememberedIdentifier",
            formData.identifier.trim(),
          );
          localStorage.setItem("rememberedPassword", formData.password.trim());
          localStorage.setItem("rememberMe", "true");
        } else {
          localStorage.removeItem("rememberedIdentifier");
          localStorage.removeItem("rememberedPassword");
          localStorage.removeItem("rememberMe");
        }
        antMessage.success("Logged in successfully!");
        setTimeout(() => {
          handleNavigate(data.user.jobTitle);
        }, 1000);
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (jobTitle) => {
    const pos = jobTitle?.toLowerCase() || "";

    switch (pos) {
      case "admin":
        navigate("/dashboard/user-management/view-users");
        break;
      case "pilot":
        navigate("/dashboard/flight-log");
        break;
      case "maintenance manager":
        navigate("/dashboard/maintenance-log");
        break;
      case "officer-in-charge":
        navigate("/dashboard/parts-lifespan-monitoring");
        break;
      case "warehouse department":
        navigate("/dashboard/parts-requisition");
        break;
      default:
        navigate("/dashboard/profile"); // fallback dashboard
        break;
    }
  };
  return (
    <Card className="login-container">
      <Row align={"middle"} justify={"center"} style={{ marginBottom: 20 }}>
        <Col span={24} style={{ textAlign: "center" }}>
          <Title level={2} className="title">
            Login
          </Title>
          <Text>Please enter your AirMS account details to log in</Text>
        </Col>
      </Row>

      <Form layout="vertical" className="login-form" onFinish={handleSubmit}>
        <Form.Item label="Username/Email" required>
          <Input
            type="text"
            id="identifier"
            size="large"
            placeholder="Enter username/email"
            value={formData.identifier}
            onChange={handleInputChange}
            autoComplete="username"
            required
            allowClear
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
          />
        </Form.Item>
        <Row style={{ marginBottom: 10 }}>
          <Col xs={12}>
            <Checkbox
              id="remember"
              checked={rememberMe}
              onChange={handleRememberMeChange}
            >
              Remember Me
            </Checkbox>
          </Col>
          <Col xs={12} style={{ textAlign: "right" }}>
            <Link to="/forgot" className="forgot-password">
              Forgot password?
            </Link>
          </Col>
        </Row>

        <Button
          htmlType="submit"
          type="primary"
          className="login-btn"
          disabled={!isFormValid || loading}
        >
          {loading ? "PLEASE WAIT..." : "LOGIN"}
        </Button>

        {error && (
          <div className="error" style={{ color: "red" }}>
            {error}
          </div>
        )}
      </Form>
    </Card>
  );
};

export default Login;
