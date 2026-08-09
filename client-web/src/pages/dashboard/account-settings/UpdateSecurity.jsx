import React, { useState, useEffect, useContext } from "react";
import {
  Row,
  Col,
  Space,
  Input,
  Button,
  Typography,
  Tabs,
  Form,
  Card,
  Alert,
  Tooltip,
} from "antd";
import { AuthContext } from "../../../context/AuthContext";
import { API_BASE } from "../../../utils/API_BASE";
import ResultPopup from "../../../components/common/ResultPopup";
import {
  ClearOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
} from "@ant-design/icons";
const { Text } = Typography;

export default function UpdateSecurity() {
  const { user, setUser, getValidToken } = useContext(AuthContext);
  const userId = user?.id || user?._id;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordSubmitAttempted, setPasswordSubmitAttempted] = useState(false);

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinErrors, setPinErrors] = useState({});
  const [forgotPinMode, setForgotPinMode] = useState(false);
  const [passwordForPin, setPasswordForPin] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [showPinValues, setShowPinValues] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [pinResetToken, setPinResetToken] = useState("");
  const [otpInputResetKey, setOtpInputResetKey] = useState(0);
  const [popup, setPopup] = useState({
    open: false,
    status: "success",
    title: "",
    subTitle: "",
  });

  useEffect(() => {
    setPasswordErrors({
      minLength: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      number: /\d/.test(newPassword),
      match: newPassword === confirmPassword && confirmPassword !== "",
    });
  }, [newPassword, confirmPassword]);

  const passwordRequirements = [
    {
      key: "currentPassword",
      met: currentPassword.trim().length > 0,
      label: "Enter your current password.",
    },
    {
      key: "minLength",
      met: passwordErrors.minLength,
      label: "Use at least 8 characters.",
    },
    {
      key: "uppercase",
      met: passwordErrors.uppercase,
      label: "Include at least one uppercase letter.",
    },
    {
      key: "number",
      met: passwordErrors.number,
      label: "Include at least one number.",
    },
    {
      key: "match",
      met: passwordErrors.match,
      label: "Passwords must match.",
    },
  ];
  const failedPasswordRequirements = passwordRequirements.filter(
    (requirement) => !requirement.met,
  );
  const showPasswordValidation =
    passwordSubmitAttempted && failedPasswordRequirements.length > 0;

  useEffect(() => {
    setPinErrors({
      isSixDigits: newPin.length === 6,
      match: newPin === confirmPin && newPin.length === 6,
    });
  }, [newPin, confirmPin]);

  const resetAll = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setPasswordForPin("");
    setOtp("");
    setPinResetToken("");
    setPasswordSubmitAttempted(false);
    setShowPinValues(false);
    setOtpInputResetKey((key) => key + 1);
    //adds delay for resetting validation message
    setTimeout(() => {
      setValidationMessage("");
    }, 3000);
  };

  const clearPinFields = () => {
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setOtp("");
    setValidationMessage("");
    setOtpInputResetKey((key) => key + 1);
  };

  const clearPinResetFlow = () => {
    clearPinFields();
    setPasswordForPin("");
    setOtpSent(false);
    setOtpVerified(false);
    setPinResetToken("");
  };

  const savePassword = async () => {
    setPasswordSubmitAttempted(true);
    if (failedPasswordRequirements.length > 0) {
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/user/change-password/${userId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await getValidToken()}`,
            "x-action-confirmed": "true",
          },
          body: JSON.stringify({ currentPassword, newPassword }),
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setValidationMessage("");
      setPasswordSubmitAttempted(false);
      setPopup({
        open: true,
        status: "success",
        title: "Password Updated!",
        subTitle: "Your password has been updated successfully.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: err.message || "Failed to update password.",
      });
    }
  };

  const savePin = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/user/update-pin/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getValidToken()}`,
          "x-action-confirmed": "true",
        },
        body: JSON.stringify({
          currentPin,
          newPin,
          confirmAction: true,
        }),
      });

      const data = await res.json();

      // console.log("Status:", res.status);
      // console.log("Response:", data);

      if (!res.ok) throw new Error(data.message);

      setUser((prev) => ({ ...prev, pin: newPin }));
      setPopup({
        open: true,
        status: "success",
        title: "PIN Updated!",
        subTitle: "Your PIN has been updated successfully.",
      });
      resetAll();
    } catch (err) {
      console.error(err);
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: err.message || "Failed to update PIN.",
      });
    }
  };

  const requestOtpForPin = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/user/request-pin-reset/${userId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await getValidToken()}`,
          },
          body: JSON.stringify({ currentPassword: passwordForPin }),
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setOtpSent(true);
      setPinResetToken(data.token); // store the token here
      setValidationMessage("");
      setPopup({
        open: true,
        status: "success",
        title: "OTP Sent!",
        subTitle: "Verification OTP has been sent to your email.",
      });
    } catch (err) {
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: err.message || "Failed to send OTP.",
      });
    }
  };
  const verifyOtp = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/user/verify-pin-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getValidToken()}`,
        },
        body: JSON.stringify({ otp, token: pinResetToken }), // use token from state
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.message.includes("expired")) {
          setOtpSent(false); // allow resending
          setValidationMessage("");
          setPopup({
            open: true,
            status: "error",
            title: "Operation failed!",
            subTitle: "OTP expired! Please request a new one.",
          });
        } else {
          throw new Error(data.message);
        }
        return;
      }

      setOtpVerified(true);
      setPopup({
        open: true,
        status: "success",
        title: "OTP Verified!",
        subTitle: "You can now reset your PIN.",
      });
    } catch (err) {
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: err.message || "Failed to verify OTP.",
      });
    }
  };
  const resetForgottenPin = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/user/reset-pin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getValidToken()}`,
          "x-action-confirmed": "true",
        },
        body: JSON.stringify({
          token: pinResetToken,
          newPin,
          confirmAction: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setPopup({
        open: true,
        status: "success",
        title: "PIN Reset!",
        subTitle: "Your PIN has been reset successfully.",
      });

      setOtpVerified(false);
      setOtpSent(false);
      setForgotPinMode(false);
      resetAll();
      setPinResetToken("");
    } catch (err) {
      setPopup({
        open: true,
        status: "error",
        title: "Operation failed!",
        subTitle: err.message || "Failed to reset PIN.",
      });
    }
  };
  const PasswordTab = (
    <Card size="small" styles={{ body: { padding: 16 } }}>
      <Space orientation="vertical" size={12} style={{ width: "100%" }}>
        <Text type="secondary">
          Use a strong password with at least 8 characters, uppercase letters,
          and numbers.
        </Text>
        <Form layout="vertical" requiredMark={false}>
          <Form.Item label="Current Password" required>
            <Input.Password
              size="large"
              placeholder="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              allowClear
            />
          </Form.Item>

          <Form.Item label="New Password" required>
            <Input.Password
              size="large"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              allowClear
            />
          </Form.Item>

          <Form.Item
            label="Confirm Password"
            required
            validateStatus={
              passwordSubmitAttempted && !passwordErrors.match ? "error" : ""
            }
          >
            <Input.Password
              size="large"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              allowClear
            />
          </Form.Item>

          <Space
            orientation="vertical"
            size={6}
            style={{ width: "100%", marginBottom: 8 }}
          >
            {showPasswordValidation && (
              <Alert
                type="error"
                showIcon
                title="Password requirements not met"
                description={
                  <Space orientation="vertical" size={2}>
                    {failedPasswordRequirements.map((requirement) => (
                      <Text key={requirement.key}>{requirement.label}</Text>
                    ))}
                  </Space>
                }
              />
            )}
            {validationMessage && (
              <Alert
                type={
                  validationMessage.includes("successfully")
                    ? "success"
                    : "error"
                }
                showIcon
                title={validationMessage}
              />
            )}
          </Space>

          <Row justify="end" style={{ marginTop: 16 }}>
            <Col xs={24} sm="auto">
              <Space
                size={8}
                wrap={false}
                style={{ width: "100%", justifyContent: "flex-end" }}
              >
                <Button
                  type="default"
                  onClick={resetAll}
                  icon={<ClearOutlined />}
                  style={{ flex: 1 }}
                >
                  Clear
                </Button>
                <Button
                  type="primary"
                  onClick={savePassword}
                  style={{ flex: 1 }}
                >
                  Save Password
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Space>
    </Card>
  );

  const PinTab = (
    <Card size="small" styles={{ body: { padding: 16 } }}>
      <Form layout="vertical" requiredMark={false}>
        <Row justify="end" style={{ marginBottom: 8 }}>
          <Tooltip title={showPinValues ? "Hide PIN" : "Peek PIN"}>
            <Button
              type="text"
              icon={showPinValues ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              aria-label={showPinValues ? "Hide PIN" : "Peek PIN"}
              onClick={() => setShowPinValues((current) => !current)}
            />
          </Tooltip>
        </Row>
        {!forgotPinMode && (
          <>
            <Form.Item label="Current PIN" required>
              <Input.OTP
                key={`current-pin-${otpInputResetKey}`}
                length={6}
                formatter={(str) => str.replace(/\D/g, "")}
                value={currentPin}
                onChange={(val) => setCurrentPin(val)}
                type={showPinValues ? "text" : "password"}
                allowClear
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="link"
                onClick={() => {
                  setCurrentPin("");
                  setNewPin("");
                  setConfirmPin("");
                  setOtpInputResetKey((key) => key + 1);
                  setForgotPinMode(true);
                }}
              >
                Forgot PIN?
              </Button>
            </Form.Item>

            <Form.Item label="New PIN" required>
              <Input.OTP
                key={`new-pin-${otpInputResetKey}`}
                length={6}
                formatter={(str) => str.replace(/\D/g, "")}
                value={newPin}
                onChange={(val) => setNewPin(val)}
                type={showPinValues ? "text" : "password"}
                allowClear
              />
            </Form.Item>

            <Form.Item label="Confirm PIN" required>
              <Input.OTP
                key={`confirm-pin-${otpInputResetKey}`}
                length={6}
                formatter={(str) => str.replace(/\D/g, "")}
                value={confirmPin}
                onChange={(val) => setConfirmPin(val)}
                type={showPinValues ? "text" : "password"}
                allowClear
              />
            </Form.Item>
            <Space
              orientation="vertical"
              size={6}
              style={{ width: "100%", marginBottom: 8 }}
            >
              {validationMessage && (
                <Alert
                  type={
                    validationMessage.includes("successfully")
                      ? "success"
                      : "error"
                  }
                  showIcon
                  title={validationMessage}
                />
              )}
            </Space>

            <Row justify="end" gutter={8}>
              <Col>
                <Button
                  type="default"
                  onClick={clearPinFields}
                  icon={<ClearOutlined />}
                >
                  Clear
                </Button>
              </Col>
              <Col>
                <Button
                  type="primary"
                  onClick={savePin}
                  disabled={!Object.values(pinErrors).every(Boolean)}
                >
                  Save PIN
                </Button>
              </Col>
            </Row>
          </>
        )}

        {forgotPinMode && !otpSent && (
          <>
            <Form.Item label="Current Password" required>
              <Input.Password
                size="large"
                placeholder="Enter your current password"
                value={passwordForPin}
                onChange={(e) => setPasswordForPin(e.target.value)}
                allowClear
              />
            </Form.Item>

            {validationMessage && (
              <Text type="danger">{validationMessage}</Text>
            )}

            <Row justify="end" gutter={8}>
              <Col>
                <Button type="default" onClick={() => setForgotPinMode(false)}>
                  Cancel
                </Button>
              </Col>
              <Col>
                <Button
                  type="primary"
                  onClick={requestOtpForPin}
                  disabled={!passwordForPin}
                >
                  Send OTP to Email
                </Button>
              </Col>
            </Row>
          </>
        )}

        {forgotPinMode && otpSent && !otpVerified && (
          <>
            <Form.Item label="OTP" required>
              <Input.OTP
                key={`otp-${otpInputResetKey}`}
                length={6}
                formatter={(str) => str.replace(/\D/g, "")}
                value={otp}
                onChange={(val) => setOtp(val)}
                type={showPinValues ? "text" : "password"}
              />
            </Form.Item>

            {validationMessage && (
              <Text type="danger">{validationMessage}</Text>
            )}

            <Row justify="end" gutter={8}>
              <Col>
                <Button type="default" onClick={requestOtpForPin}>
                  Resend OTP
                </Button>
              </Col>
              <Col>
                <Button type="primary" onClick={verifyOtp} disabled={!otp}>
                  Verify OTP
                </Button>
              </Col>
            </Row>
          </>
        )}

        {forgotPinMode && otpVerified && (
          <>
            <Form.Item label="New PIN" required>
              <Input.OTP
                key={`reset-new-pin-${otpInputResetKey}`}
                length={6}
                formatter={(str) => str.replace(/\D/g, "")}
                value={newPin}
                onChange={(val) => setNewPin(val)}
                type={showPinValues ? "text" : "password"}
                allowClear
              />
            </Form.Item>

            <Form.Item label="Confirm PIN" required>
              <Input.OTP
                key={`reset-confirm-pin-${otpInputResetKey}`}
                length={6}
                formatter={(str) => str.replace(/\D/g, "")}
                value={confirmPin}
                onChange={(val) => setConfirmPin(val)}
                type={showPinValues ? "text" : "password"}
                allowClear
              />
            </Form.Item>

            <Row justify="end" gutter={8}>
              <Col>
                <Button
                  type="default"
                  onClick={clearPinResetFlow}
                  icon={<ClearOutlined />}
                >
                  Clear
                </Button>
              </Col>
              <Col>
                <Button
                  type="primary"
                  onClick={resetForgottenPin}
                  disabled={!Object.values(pinErrors).every(Boolean)}
                >
                  Reset PIN
                </Button>
              </Col>
            </Row>
          </>
        )}
      </Form>
    </Card>
  );

  return (
    <>
      <Row justify="center" style={{ marginTop: 4 }}>
        <Col xs={24}>
          <Tabs
            tabBarStyle={{ marginBottom: 12 }}
            items={[
              { key: "1", label: "Password", children: PasswordTab },
              { key: "2", label: "PIN", children: PinTab },
            ]}
          />
        </Col>
      </Row>
      <ResultPopup
        open={popup.open}
        status={popup.status}
        title={popup.title}
        subTitle={popup.subTitle}
        onClose={() => setPopup((prev) => ({ ...prev, open: false }))}
      />
    </>
  );
}
