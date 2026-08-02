import { useContext, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import "./login.css";
import {
  Input,
  Checkbox,
  Button,
  Typography,
  Row,
  Col,
  Form,
  Select,
} from "antd";
import { API_BASE } from "../../utils/API_BASE";
import { AuthContext } from "../../context/AuthContext";
import LoginLayout from "../../components/layout/LoginLayout";
import PrivacyPolicyModal from "../../components/common/PrivacyPolicyModal";
import TermsAndConditionsModal from "../../components/common/TermsAndConditionsModal";
import {
  EnvironmentOutlined,
  LockOutlined,
  UserOutlined,
} from "@ant-design/icons";
import AirMSLogo from "../../assets/AirMS_web.webp";
import ResultPopup from "../../components/common/ResultPopup";
const { Text } = Typography;

const Login = () => {
  const { loginUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const pendingDashboardPathRef = useRef("");
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
    base: "",
  });
  const [popup, setPopup] = useState({
    open: false,
    status: "success",
    title: "",
    subTitle: "",
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  // Load saved credentials on component mount
  useEffect(() => {
    const savedIdentifier = localStorage.getItem("rememberedIdentifier");
    const savedBase = localStorage.getItem("rememberedBase") || "";
    const savedRememberMe = localStorage.getItem("rememberMe") === "true";

    setRememberMe(savedRememberMe);

    if (savedRememberMe && savedIdentifier) {
      setFormData({
        identifier: savedIdentifier,
        password: "",
        base: savedBase,
      });
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
      localStorage.removeItem("rememberedBase");
    } else {
      localStorage.setItem("rememberMe", "true");
    }
  };

  const handleSubmit = async () => {
    setError("");

    const identifier = formData.identifier?.trim();
    const password = formData.password?.trim();
    const base = formData.base?.trim();

    if (!identifier && !password) {
      setError("Username/email and password are required");
      return;
    }
    if (!identifier && password) {
      setError("Username/email are required");
      return;
    }
    if (identifier && !password) {
      setError("Password is required");
      return;
    }
    if (!base) {
      setError("Please select where you are logging in from");
      return;
    }
    setLoading(true);

    try {
      const trustedDeviceToken =
        localStorage.getItem("trustedDeviceToken") || "";

      const response = await fetch(`${API_BASE}/api/user/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-platform": "WEB",
          "x-base": base,
        },
        body: JSON.stringify({
          identifier,
          password,
          client: "web",
          rememberMe,
          base,
          trustedDeviceToken,
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

        if (data.requireLoginOtp && data.verification?.token) {
          navigate("/verification", {
            state: {
              mode: "login-2fa",
              token: data.verification.token,
              email: data.verification.email,
              maskedEmail: data.verification.maskedEmail,
              identifier,
              rememberMe,
              base,
              client: "web",
            },
          });
          return;
        }

        await loginUser(data.user, data.token, {
          rememberMe,
          base: data.user?.base || base,
          sessionId: data.sessionId || data.user?.sessionId,
        });

        if (rememberMe) {
          localStorage.setItem(
            "rememberedIdentifier",
            formData.identifier.trim(),
          );

          localStorage.setItem("rememberMe", "true");
          localStorage.setItem("rememberedBase", data.user?.base || base);
        } else {
          localStorage.removeItem("rememberedIdentifier");
          localStorage.removeItem("rememberedBase");
          localStorage.removeItem("rememberMe");
        }
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
      setPopup({
        open: true,
        status: "error",
        title: "Login Failed",
        subTitle: "Network error. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (loggedInUser) => {
    const pos = loggedInUser?.jobTitle?.toLowerCase() || "";
    let dashboardPath = "/dashboard/profile";

    switch (pos) {
      case "superadmin":
        dashboardPath = "/dashboard/user-management/view-users";
        break;
      case "mechanic":
        dashboardPath = "/dashboard/maintenance-log";
        break;
      case "maintenance manager":
      case "officer-in-charge":
        dashboardPath = "/dashboard/maintenance-dashboard";
        break;
      case "warehouse staff":
        dashboardPath = "/dashboard/parts-requisition";
        break;
    }

    pendingDashboardPathRef.current = dashboardPath;
    setPopup({
      open: true,
      status: "success",
      title: "Login Successful",
      subTitle: "You have been logged in successfully.",
    });
  };

  const handlePopupClose = () => {
    setPopup((prev) => ({ ...prev, open: false }));

    if (pendingDashboardPathRef.current) {
      const dashboardPath = pendingDashboardPathRef.current;
      pendingDashboardPathRef.current = "";
      navigate(dashboardPath);
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
        <Form layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Username or Email"
            required
            style={{ fontWeight: "bold" }}
          >
            <Input
              type="text"
              id="identifier"
              size="large"
              placeholder="Enter your username or email"
              value={formData.identifier}
              onChange={handleInputChange}
              autoComplete="username"
              allowClear
              prefix={<UserOutlined />}
            />
          </Form.Item>

          <Form.Item label="Password" required style={{ fontWeight: "bold" }}>
            <Input.Password
              id="password"
              placeholder="Enter your password"
              size="large"
              value={formData.password}
              onChange={handleInputChange}
              autoComplete="current-password"
              allowClear
              prefix={<LockOutlined />}
            />
          </Form.Item>

          <Form.Item label="Logging in from" required>
            <Select
              id="base"
              aria-label="Logging in from"
              size="large"
              placeholder="Select base"
              required
              value={formData.base || undefined}
              onChange={(value) =>
                setFormData((prevState) => ({ ...prevState, base: value }))
              }
              suffixIcon={<EnvironmentOutlined />}
              options={[
                { value: "MANILA", label: "Manila" },
                { value: "CEBU", label: "Cebu" },
                { value: "CDO", label: "CDO" },
              ]}
            />
            {error && <Text type="danger">{error}</Text>}
          </Form.Item>

          <Row style={{ marginBottom: 20 }}>
            <Col xs={12} sm={12}>
              <Checkbox
                id="remember"
                checked={rememberMe}
                onChange={handleRememberMeChange}
              >
                Remember me
              </Checkbox>
            </Col>
            <Col
              xs={12}
              sm={12}
              style={{ display: "flex", justifyContent: "flex-end" }}
            >
              <Link
                to="/forgot"
                className="link"
                style={{ textAlign: "right" }}
              >
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
          <Text
            type="secondary"
            style={{
              display: "block",
              marginTop: 16,
              textAlign: "center",
              fontSize: 13,
            }}
          >
            By signing in, you agree to the{" "}
            <Button
              type="link"
              size="small"
              onClick={() => setTermsOpen(true)}
              style={{ height: "auto", padding: 0, fontSize: 13 }}
            >
              Terms and Conditions
            </Button>{" "}
            and{" "}
            <Button
              type="link"
              size="small"
              onClick={() => setPrivacyOpen(true)}
              style={{ height: "auto", padding: 0, fontSize: 13 }}
            >
              Privacy Policy
            </Button>
            .
          </Text>
        </Form>
      </LoginLayout>
      <PrivacyPolicyModal
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
      />
      <TermsAndConditionsModal
        open={termsOpen}
        onClose={() => setTermsOpen(false)}
      />
      <ResultPopup
        open={popup.open}
        status={popup.status}
        title={popup.title}
        subTitle={popup.subTitle}
        onClose={handlePopupClose}
      />
    </>
  );
};

export default Login;
