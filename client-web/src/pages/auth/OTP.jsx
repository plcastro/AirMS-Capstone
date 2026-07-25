// WEB
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button, Input, Typography, Row, Col, Checkbox } from "antd";
import { API_BASE } from "../../utils/API_BASE";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";

import "./login.css";
import "../../App.css";
import LoginLayout from "../../components/layout/LoginLayout";
import ResultPopup from "../../components/common/ResultPopup";
const { Title, Text } = Typography;

export default function OTP() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = location.state || {};
  const { loginUser } = useContext(AuthContext);
  const pendingDashboardPathRef = useRef("");
  const mode = params.mode || "password-reset";
  const token = params.token;
  const email = params.email;
  const maskedEmail = params.maskedEmail;

  const [code, setCode] = useState("");
  const [resendTimer, setResendTimer] = useState(60);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [trustDevice, setTrustDevice] = useState(true);
  const [fieldError, setFieldError] = useState("");
  const [popup, setPopup] = useState({
    open: false,
    status: "success",
    title: "",
    subTitle: "",
  });
  const MAX_CODE_LENGTH = 6;
  const pinReady = code.length === MAX_CODE_LENGTH;

  const maskEmail = (email) => {
    const [localPart, domain] = email.split("@");
    const maskedLocal =
      localPart.length > 2
        ? localPart[0] + "*".repeat(localPart.length - 2) + localPart.slice(-1)
        : localPart[0] + "*";
    return `${maskedLocal}@${domain}`;
  };

  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const handleVerify = async () => {
    if (!pinReady) return;

    if (!token) {
      setPopup({
        open: true,
        status: "error",
        title: "Verification Failed",
        subTitle: "Missing verification token.",
      });
      return;
    }

    try {
      setConfirmLoading(true);
      const verifyEndpoint =
        mode === "login-2fa"
          ? `${API_BASE}/api/user/login/verify-otp`
          : `${API_BASE}/api/user/verify-otp`;
      const payload =
        mode === "login-2fa"
          ? {
              token,
              otp: code,
              rememberMe: Boolean(params.rememberMe),
              base: params.base,
              client: params.client || "web",
              trustDevice,
              trustedDeviceLabel:
                typeof navigator !== "undefined" ? navigator.userAgent : "web",
            }
          : { token, otp: code };

      const res = await fetch(verifyEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const data = await res.json();
      setConfirmLoading(false);

      if (res.ok) {
        if (mode === "login-2fa") {
          if (data?.trustedDeviceToken) {
            localStorage.setItem("trustedDeviceToken", data.trustedDeviceToken);
          }
          await loginUser(data.user, data.token, {
            rememberMe: Boolean(params.rememberMe),
            base: data.user?.base || params.base,
            sessionId: data.sessionId || data.user?.sessionId,
          });

          if (params.rememberMe) {
            localStorage.setItem("rememberMe", "true");
            if (params.identifier) {
              localStorage.setItem(
                "rememberedIdentifier",
                String(params.identifier).trim(),
              );
            }
            localStorage.setItem("rememberedBase", data.user?.base || params.base || "");
          } else {
            localStorage.removeItem("rememberedIdentifier");
            localStorage.removeItem("rememberedBase");
            localStorage.removeItem("rememberMe");
          }

          setPopup({
            open: true,
            status: "success",
            title: "Login Verified",
            subTitle: "You have been successfully logged in.",
          });

          const role = String(data?.user?.jobTitle || "").toLowerCase();
          if (role === "superadmin") {
            pendingDashboardPathRef.current =
              "/dashboard/user-management/view-users";
          } else if (role === "mechanic") {
            pendingDashboardPathRef.current = "/dashboard/maintenance-log";
          } else if (
            role === "maintenance manager" ||
            role === "officer-in-charge"
          ) {
            pendingDashboardPathRef.current = "/dashboard/maintenance-dashboard";
          } else if (role === "warehouse staff") {
            pendingDashboardPathRef.current = "/dashboard/parts-requisition";
          } else {
            pendingDashboardPathRef.current = "/dashboard/profile";
          }
          return;
        }

        setPopup({
          open: true,
          status: "success",
          title: "Verification Successful",
          subTitle: "OTP has been verified. Redirecting...",
        });

        navigate(`/reset-password?token=${token}`);
      } else {
        setFieldError(data.message || "OTP is invalid.");
      }
    } catch (err) {
      console.error("OTP verification error:", err);
      setConfirmLoading(false);
      setPopup({
        open: true,
        status: "error",
        title: "Verification Failed",
        subTitle: "Failed to verify OTP. Try again.",
      });
    }
  };

  const handlePopupClose = () => {
    setPopup((prev) => ({ ...prev, open: false }));

    if (pendingDashboardPathRef.current) {
      const dashboardPath = pendingDashboardPathRef.current;
      pendingDashboardPathRef.current = "";
      navigate(dashboardPath);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;

    if (!email) {
      setPopup({
        open: true,
        status: "error",
        title: "Resend OTP Failed",
        subTitle: "Email not available to resend OTP.",
      });
      return;
    }

    try {
      const resendEndpoint =
        mode === "login-2fa"
          ? `${API_BASE}/api/user/login/resend-otp`
          : `${API_BASE}/api/user/request-password-reset`;
      const resendPayload = mode === "login-2fa" ? { token } : { email };

      const res = await fetch(resendEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resendPayload),
      });

      const data = await res.json();
      if (res.ok) {
        setPopup({
          open: true,
          status: "success",
          title: "OTP Resent",
          subTitle: "OTP resent to your email.",
        });

        setResendTimer(60);
      } else {
        setPopup({
          open: true,
          status: "error",
          title: "Resend OTP Failed",
          subTitle: data.message || "Failed to resend OTP.",
        });
      }
    } catch (err) {
      console.error("Resend OTP error:", err);
      setPopup({
        open: true,
        status: "error",
        title: "Failed to Resend OTP ",
        subTitle: "Failed to resend OTP. Please try again later",
      });
    }
  };

  return (
    <>
      <LoginLayout
        title={
          mode === "login-2fa" ? "Login Verification" : "Account Verification"
        }
        subtitle={`Enter the 6-digit code sent to ${maskedEmail || (email ? maskEmail(email) : "your email")}`}
      >
        <Row align={"middle"} justify={"center"} style={{ marginBottom: 20 }}>
          <Col span={24} style={{ textAlign: "center" }}>
            <Input.OTP
              value={code}
              onChange={(value) => {
                setCode(value);
                if (value.length) setFieldError("");
              }}
              autoFocus
              style={{ marginTop: 20, fontSize: 24, letterSpacing: 12 }}
              length={6}
              formatter={(str) => str.replace(/\D/g, "")}
            />
            {fieldError && (
              <Text type="danger" style={{ display: "block", marginTop: 10 }}>
                {fieldError}
              </Text>
            )}
          </Col>
        </Row>

        <Button
          type="primary"
          size="large"
          onClick={handleVerify}
          disabled={!pinReady}
          loading={confirmLoading}
          style={{ width: "100%", marginBottom: 10 }}
          className="login-btn"
        >
          Verify
        </Button>
        {mode === "login-2fa" && (
          <div style={{ marginBottom: 10 }}>
            <Checkbox
              checked={trustDevice}
              onChange={(e) => setTrustDevice(e.target.checked)}
            >
              Trust this device for 30 days
            </Checkbox>
          </div>
        )}
        <Button
          type="default"
          size="large"
          onClick={handleResend}
          disabled={resendTimer > 0}
          style={{ width: "100%" }}
        >
          {resendTimer > 0 ? `Resend code (${resendTimer}s)` : "Resend code"}
        </Button>
      </LoginLayout>
      <ResultPopup
        open={popup.open}
        status={popup.status}
        title={popup.title}
        subTitle={popup.subTitle}
        onClose={handlePopupClose}
      />
    </>
  );
}
