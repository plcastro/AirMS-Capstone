import { useContext } from "react";
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
        body: JSON.stringify({ identifier, password }),
        credentials: "include",
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error("Non-JSON response from server:", text);
        setError("Server error. Please try again later.");
        return;
      }

      if (response.ok) {
        if (data.requireSetup) {
          navigate(
            `/security-setup?setupToken=${encodeURIComponent(data.user.setupToken)}&email=${encodeURIComponent(data.user.email)}`,
          );
          return;
        }
        await loginUser(data.user, data.token);

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
        handleNavigate(data.user.jobTitle);
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

  const handleNavigate = (loggedInUser) => {
    if (loggedInUser?.securitySetupCompleted && !loggedInUser?.signature) {
      navigate("/dashboard/profile");
      return;
    }

    const pos = loggedInUser?.jobTitle?.toLowerCase() || "";

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
        navigate("/dashboard/profile");
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

      <Form layout="vertical" onFinish={handleSubmit}>
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
          <Row>{error && <Text type="danger">{error}</Text>}</Row>
        </Form.Item>

        <Row
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <Col lg={12}>
            <Checkbox
              id="remember"
              checked={rememberMe}
              onChange={handleRememberMeChange}
            >
              Remember Me
            </Checkbox>
          </Col>
          <Col lg={12} style={{ textAlign: "right" }}>
            <Link to="/forgot" className="forgot-password">
              Forgot password?
            </Link>
          </Col>
        </Row>

        <Button
          htmlType="submit"
          type="primary"
          className="login-btn"
          disabled={loading}
        >
          {loading ? "PLEASE WAIT..." : "LOGIN"}
        </Button>
      </Form>
    </Card>
  );
};

export default Login;
