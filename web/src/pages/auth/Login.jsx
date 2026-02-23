import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import "./login.css";
import { UserOutlined } from "@ant-design/icons";
import { Flex, Input } from "antd";

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load saved credentials on component mount
  useEffect(() => {
    const savedUsername = localStorage.getItem("rememberedUsername");
    const savedPassword = localStorage.getItem("rememberedPassword");
    const savedRememberMe = localStorage.getItem("rememberMe") === "true";

    if (savedRememberMe && savedUsername) {
      setFormData({
        username: savedUsername,
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
      localStorage.removeItem("rememberedUsername");
      localStorage.removeItem("rememberedPassword");
    } else {
      localStorage.setItem("rememberMe", "true");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Prevent empty fields
    if (!formData.username.trim() || !formData.password.trim()) {
      setError("Username and password are required");
      return;
    }

    setLoading(true);

    try {
      // const response = await fetch("http://localhost:8000/api/users/login", {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify({
      //     username: formData.username.trim(),
      //     password: formData.password.trim(),
      //   }),
      // });

      // let data;
      // try {
      //   data = await response.json(); // parse JSON safely
      // } catch {
      //   setError("Invalid response from server");
      //   return;
      // }

      // if (response.ok) {
      //   // Store user data
      //   localStorage.setItem("currentUser", JSON.stringify(data.user));

      //   // Handle Remember Me functionality
      //   if (rememberMe) {
      //     localStorage.setItem("rememberedUsername", formData.username.trim());
      //     localStorage.setItem("rememberedPassword", formData.password.trim());
      //     localStorage.setItem("rememberMe", "true");
      //   } else {
      //     // Clear saved credentials if Remember Me is not checked
      //     localStorage.removeItem("rememberedUsername");
      //     localStorage.removeItem("rememberedPassword");
      //     localStorage.removeItem("rememberMe");
      //   }

      navigate("/dashboard/");
      // } else {
      //   setError(data.error || "Login failed");
      // }
    } catch (err) {
      console.error("Login error:", err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
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
            <label htmlFor="username">Username</label>
            <Input
              type="text"
              id="username"
              placeholder="Enter your username"
              value={formData.username}
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

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Logging in..." : "LOGIN"}
          </button>

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
