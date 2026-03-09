import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import "./login.css";
import { Input, Button, message as antMessage } from "antd";
import { API_BASE } from "../../utils/API_BASE";

const Login = () => {
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
    e.preventDefault();
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
      console.log("Login response:", data);

      if (response.ok) {
        if (data.requireSetup) {
          navigate(
            `/security-setup?setupToken=${encodeURIComponent(data.user.setupToken)}`,
          );
          return;
        }

        // Normal login
        localStorage.setItem("jwtToken", data.token);
        localStorage.setItem("currentUser", JSON.stringify(data.user));

        // Remember Me
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

  const handleNavigate = (jobTitle) => {
    // Normalize jobTitle to lowercase for comparison
    const pos = jobTitle?.toLowerCase() || "";

    switch (pos) {
      case "admin":
        navigate("/dashboard/user-management/view-users");
        break;
      case "pilot":
        navigate("/dashboard/flight-log");
        break;
      case "head of maintenance":
        navigate("/dashboard/maintenance-log");
        break;
      case "manager":
        navigate("/dashboard/inventory-management");
        break;
      default:
        navigate("/dashboard/profile"); // fallback dashboard
        break;
    }
  };
  return (
    <div className="login-container">
      <div className="login-content">
        <h1 className="title">Login</h1>
        <p className="subtitle">
          Please enter your AirMS account details to log in
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username/Email</label>
            <Input
              type="text"
              id="identifier"
              placeholder="Enter your username/email"
              value={formData.identifier}
              onChange={handleInputChange}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <Input
              type="password"
              id="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleInputChange}
              autoComplete="current-password"
              required
            />
          </div>

          <div className="remember-forgot">
            <div className="remember-me">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={handleRememberMeChange}
              />
              <label htmlFor="remember">Remember me</label>
            </div>
            <Link to="/forgot" className="forgot-password">
              Forgot password?
            </Link>
          </div>

          <Button
            htmlType="submit"
            type="primary"
            className="login-btn"
            disabled={!isFormValid || loading}
          >
            {loading ? "Logging in..." : "LOGIN"}
          </Button>

          {error && (
            <div className="error" style={{ color: "red" }}>
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Login;
