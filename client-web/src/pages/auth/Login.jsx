import { useContext } from "react";
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
} from "antd";
import { API_BASE } from "../../utils/API_BASE";
import { AuthContext } from "../../context/AuthContext";
import LoginLayout from "../../components/layout/LoginLayout";
import PrivacyPolicyModal from "../../components/common/PrivacyPolicyModal";
import TermsAndConditionsModal from "../../components/common/TermsAndConditionsModal";
import {
  AimOutlined,
  EnvironmentOutlined,
  LockOutlined,
  UserOutlined,
} from "@ant-design/icons";
import AirMSLogo from "../../assets/AirMS_web.webp";
import ResultPopup from "../../components/common/ResultPopup";
import {
  buildLoginLocationHeaders,
  detectLoginLocation,
} from "../../utils/loginLocation";
const { Text } = Typography;

const getTrustedDeviceStorageKey = (account) => {
  const normalizedAccount = String(account || "")
    .trim()
    .toLowerCase();
  return normalizedAccount ? `trustedDeviceToken:${normalizedAccount}` : "";
};

const Login = () => {
  const { loginUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("");
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
    const savedRememberMe = localStorage.getItem("rememberMe") === "true";

    setRememberMe(savedRememberMe);

    if (savedRememberMe && savedIdentifier) {
      setFormData({
        identifier: savedIdentifier,
        password: "",
      });
    }
  }, []);

  const handleDetectLocation = async () => {
    try {
      setLocationStatus("Getting your location...");
      setError("");
      const nextLocation = await detectLoginLocation();
      setLocation(nextLocation);
      setLocationStatus("Location detected.");
    } catch (locationError) {
      console.error("Geolocation error:", locationError);
      setLocation(null);
      setLocationStatus(
        locationError?.message ||
          "Unable to detect your location. Please allow location access.",
      );
    }
  };

  useEffect(() => {
    handleDetectLocation();
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

  const handleSubmit = async () => {
    setError("");

    const identifier = formData.identifier?.trim();
    const password = formData.password?.trim();

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
    if (!location?.text || !location?.coordinateText) {
      setError("Allow location access so AirMS can detect where you are logging in from.");
      return;
    }
    setLoading(true);

    try {
      const trustedDeviceKey = getTrustedDeviceStorageKey(identifier);
      const trustedDeviceToken = trustedDeviceKey
        ? localStorage.getItem(trustedDeviceKey) || ""
        : "";

      const response = await fetch(`${API_BASE}/api/user/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-platform": "WEB",
          ...buildLoginLocationHeaders(location),
        },
        body: JSON.stringify({
          identifier,
          password,
          client: "web",
          rememberMe,
          location,
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
              loginLocation: location,
              client: "web",
            },
          });
          return;
        }

        await loginUser(data.user, data.token, {
          rememberMe,
          location: data.session?.location || location,
          sessionId: data.sessionId || data.user?.sessionId,
        });

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
        dashboardPath = "/dashboard/tasks";
        break;
      case "pilot":
        dashboardPath = "/dashboard/flight-log";
        break;
      case "maintenance manager":
      case "officer-in-charge":
        dashboardPath = "/dashboard/maintenance-dashboard";
        break;
      case "warehouse personnel":
        dashboardPath = "/dashboard/parts-requisition";
        break;
    }

    navigate(dashboardPath, {
      state: {
        resultPopup: {
          status: "success",
          title: "Login Successful",
          subTitle: "You have been logged in successfully.",
        },
      },
    });
  };

  const handlePopupClose = () => {
    setPopup((prev) => ({ ...prev, open: false }));
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
            <div
              className="login-location-panel"
              role="status"
              aria-live="polite"
            >
              <EnvironmentOutlined className="login-location-icon" />
              <div className="login-location-copy">
                <Text strong>
                  {location?.text || "Location not detected"}
                </Text>
                {location?.coordinateText && (
                  <Text type="secondary" className="login-location-coordinates">
                    Latitude and longitude coordinates: {location.coordinateText}
                  </Text>
                )}
                {locationStatus && !location?.text && (
                  <Text type="secondary" className="login-location-coordinates">
                    {locationStatus}
                  </Text>
                )}
              </div>
            </div>
            <Button
              type="default"
              icon={<AimOutlined />}
              onClick={handleDetectLocation}
              block
              style={{ marginTop: 8 }}
            >
              Detect location
            </Button>
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
            className="auth-terms-copy"
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
