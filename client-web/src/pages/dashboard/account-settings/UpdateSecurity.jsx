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
  message,
} from "antd";
import { AuthContext } from "../../../context/AuthContext";
import { API_BASE } from "../../../utils/API_BASE";
import { ClearOutlined } from "@ant-design/icons";
const { Text } = Typography;

export default function UpdateSecurity() {
  const { user, setUser, getValidToken } = useContext(AuthContext);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState({});

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinErrors, setPinErrors] = useState({});
  const [forgotPinMode, setForgotPinMode] = useState(false);
  const [passwordForPin, setPasswordForPin] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [pinResetToken, setPinResetToken] = useState("");

  useEffect(() => {
    setPasswordErrors({
      minLength: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      number: /\d/.test(newPassword),
      match: newPassword === confirmPassword && confirmPassword !== "",
    });
  }, [newPassword, confirmPassword]);

  const getPasswordStrength = () => {
    if (!newPassword) return { text: "", color: "" };

    const requirements = [
      newPassword.length >= 8,
      /[A-Z]/.test(newPassword),
      /\d/.test(newPassword),
      /[a-z]/.test(newPassword),
    ];

    const passedCount = requirements.filter(Boolean).length;

    if (passedCount <= 2) return { text: "Weak Password", color: "#ff4d4f" };
    if (passedCount === 3)
      return { text: "Moderate Password", color: "#faad14" };
    if (passedCount === 4) return { text: "Strong Password", color: "#00c88c" };

    return { text: "", color: "" };
  };

  const strength = getPasswordStrength();

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
    setValidationMessage("");
  };

  const savePassword = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/user/change-password/${user.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await getValidToken()}`,
          },
          body: JSON.stringify({ currentPassword, newPassword }),
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setValidationMessage("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      message.error(err.message);
    }
  };

  const savePin = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/user/update-pin/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getValidToken()}`,
        },
        body: JSON.stringify({ currentPin, newPin }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setUser((prev) => ({ ...prev, pin: newPin }));
      message.success("PIN successfully updated!");
      resetAll();
    } catch (err) {
      message.error(err.message);
    }
  };

  const requestOtpForPin = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/user/request-pin-reset/${user.id}`,
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
      setValidationMessage("Verification OTP sent to your email.");
    } catch (err) {
      setValidationMessage(err.message);
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
          setValidationMessage("OTP expired! Please request a new one.");
        } else {
          throw new Error(data.message);
        }
        return;
      }

      setOtpVerified(true);
      message.success("OTP verified! You can now reset your PIN.");
    } catch (err) {
      setValidationMessage(err.message);
    }
  };
  const resetForgottenPin = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/user/reset-pin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getValidToken()}`,
        },
        body: JSON.stringify({ token: pinResetToken, newPin }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      message.success("PIN successfully reset!");

      setOtpVerified(false);
      setOtpSent(false);
      setForgotPinMode(false);
      resetAll();
      setPinResetToken("");
    } catch (err) {
      message.error(err.message);
    }
  };
  const PasswordTab = (
    <Form layout="vertical">
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

      <Form.Item label="Confirm Password" required>
        <Input.Password
          size="large"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          allowClear
        />
      </Form.Item>

      <Space orientation="vertical" size={4} style={{ width: "100%" }}>
        {newPassword && (
          <Text style={{ color: strength.color }}>{strength.text}</Text>
        )}
        {validationMessage && (
          <Text
            type={
              validationMessage.includes("successfully") ? "success" : "danger"
            }
          >
            {validationMessage}
          </Text>
        )}
      </Space>

      <Row justify="end" gutter={8} style={{ marginTop: 16 }}>
        <Col>
          <Button type="default" onClick={resetAll} icon={<ClearOutlined />}>
            Reset
          </Button>
        </Col>
        <Col>
          <Button
            type="primary"
            onClick={savePassword}
            disabled={!Object.values(passwordErrors).every(Boolean)}
          >
            Save Password
          </Button>
        </Col>
      </Row>
    </Form>
  );

  const PinTab = (
    <Form layout="vertical">
      {!forgotPinMode && (
        <>
          <Form.Item label="Current PIN" required>
            <Input.OTP
              length={6}
              formatter={(str) => str.replace(/\D/g, "")}
              value={currentPin}
              onChange={(val) => setCurrentPin(val)}
              type="password"
              allowClear
            />
          </Form.Item>

          <Form.Item>
            <Button type="link" onClick={() => setForgotPinMode(true)}>
              Forgot PIN?
            </Button>
          </Form.Item>

          <Form.Item label="New PIN" required>
            <Input.OTP
              length={6}
              type="password"
              formatter={(str) => str.replace(/\D/g, "")}
              value={newPin}
              onChange={(val) => setNewPin(val)}
              allowClear
            />
          </Form.Item>

          <Form.Item label="Confirm PIN" required>
            <Input.OTP
              length={6}
              type="password"
              formatter={(str) => str.replace(/\D/g, "")}
              value={confirmPin}
              onChange={(val) => setConfirmPin(val)}
              allowClear
            />
          </Form.Item>

          <Row justify="end" gutter={8}>
            <Col>
              <Button
                type="default"
                onClick={resetAll}
                icon={<ClearOutlined />}
              >
                Reset
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

          {validationMessage && <Text type="danger">{validationMessage}</Text>}

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
              length={6}
              formatter={(str) => str.replace(/\D/g, "")}
              value={otp}
              onChange={(val) => setOtp(val)}
            />
          </Form.Item>

          {validationMessage && <Text type="danger">{validationMessage}</Text>}

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
              length={6}
              formatter={(str) => str.replace(/\D/g, "")}
              value={newPin}
              onChange={(val) => setNewPin(val)}
              allowClear
            />
          </Form.Item>

          <Form.Item label="Confirm PIN" required>
            <Input.OTP
              length={6}
              formatter={(str) => str.replace(/\D/g, "")}
              value={confirmPin}
              onChange={(val) => setConfirmPin(val)}
              allowClear
            />
          </Form.Item>

          <Row justify="end" gutter={8}>
            <Col>
              <Button
                type="default"
                onClick={resetAll}
                icon={<ClearOutlined />}
              >
                Reset
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
  );

  return (
    <Row justify="center">
      <Col xs={24}>
        <Tabs
          centered
          items={[
            { key: "1", label: "Password", children: PasswordTab },
            { key: "2", label: "PIN", children: PinTab },
          ]}
        />
      </Col>
    </Row>
  );
}
