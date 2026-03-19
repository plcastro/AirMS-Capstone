import React, { useContext, useRef, useState, useEffect } from "react";
import {
  Card,
  Input,
  Button,
  Typography,
  Divider,
  Row,
  Col,
  Tabs,
  message,
} from "antd";
import SignatureCanvas from "react-signature-canvas";
import { AuthContext } from "../../context/AuthContext";
import { API_BASE } from "../../utils/API_BASE";

const { Text, Title } = Typography;

export default function UpdateSecurity() {
  const { user, setUser } = useContext(AuthContext);
  const sigCanvasRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState({});

  // PIN
  const [pin, setPin] = useState(user?.pin || "");

  // Signature
  const [signatureData, setSignatureData] = useState(user?.signature || "");

  useEffect(() => {
    if (!isEditing) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPin(user?.pin || "");
      setSignatureData(user?.signature || "");
      setPasswordErrors({});
    }
  }, [isEditing, user]);

  // --- Validate password live ---
  useEffect(() => {
    const errors = {};
    if (newPassword && newPassword.length < 8)
      errors.minLength = "At least 8 characters";
    if (newPassword && !/[A-Z]/.test(newPassword))
      errors.uppercase = "One uppercase letter";
    if (newPassword && !/\d/.test(newPassword)) errors.number = "One number";
    if (confirmPassword && newPassword !== confirmPassword)
      errors.match = "Passwords do not match";
    setPasswordErrors(errors);
  }, [newPassword, confirmPassword]);

  const savePassword = async () => {
    if (
      Object.keys(passwordErrors).length > 0 ||
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      message.error("Check your password inputs");
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE}/api/user/updatePassword/${user.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ currentPassword, newPassword }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      message.success("Password updated!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      message.error(err.message || "Update failed");
    }
  };

  const savePin = async () => {
    if (pin.length !== 6) return message.error("PIN must be 6 digits");
    try {
      const res = await fetch(`${API_BASE}/api/user/updatePIN/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ PIN: pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setUser((prev) => ({ ...prev, pin }));
      message.success("PIN updated!");
    } catch (err) {
      message.error(err.message || "Update failed");
    }
  };

  const saveSignature = async () => {
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty())
      return message.warning("Signature is empty!");
    const dataURL = sigCanvasRef.current.toDataURL("image/png");
    try {
      const res = await fetch(
        `${API_BASE}/api/user/updateSignature/${user.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ signature: dataURL }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setUser((prev) => ({ ...prev, signature: dataURL }));
      setSignatureData(dataURL);
      message.success("Signature updated!");
    } catch (err) {
      message.error(err.message || "Update failed");
    }
  };

  const items = [
    {
      key: "password",
      label: "Password",
      children: (
        <>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Text>Current Password</Text>
              <Input.Password
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </Col>
            <Col xs={24} md={8}>
              <Text>New Password</Text>
              <Input.Password
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </Col>
            <Col xs={24} md={8}>
              <Text>Confirm Password</Text>
              <Input.Password
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Col>
          </Row>
          <div style={{ marginTop: 10 }}>
            <Text type={newPassword.length >= 8 ? "success" : "secondary"}>
              {newPassword.length >= 8 ? "✓" : "✗"} At least 8 characters
            </Text>
            <br />
            <Text type={/[A-Z]/.test(newPassword) ? "success" : "secondary"}>
              {/[A-Z]/.test(newPassword) ? "✓" : "✗"} One uppercase letter
            </Text>
            <br />
            <Text type={/\d/.test(newPassword) ? "success" : "secondary"}>
              {/\d/.test(newPassword) ? "✓" : "✗"} One number
            </Text>
            <br />
            <Text type={newPassword === confirmPassword ? "success" : "danger"}>
              {newPassword === confirmPassword ? "✓" : "✗"} Passwords match
            </Text>
          </div>
          <Button
            type="primary"
            style={{ marginTop: 10 }}
            onClick={savePassword}
          >
            Save Password
          </Button>
        </>
      ),
    },
    {
      key: "pin",
      label: "PIN",
      children: (
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Text>PIN</Text>
            <Input
              value={pin}
              maxLength={6}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            />
            <Button type="primary" style={{ marginTop: 10 }} onClick={savePin}>
              Save PIN
            </Button>
          </Col>
        </Row>
      ),
    },
    {
      key: "signature",
      label: "Signature",
      children: (
        <Row>
          <Col span={24}>
            <Text>Signature</Text>
            <SignatureCanvas
              ref={sigCanvasRef}
              penColor="black"
              canvasProps={{
                width: 400,
                height: 150,
                style: { border: "1px solid #ccc" },
              }}
            />
            <Button style={{ marginTop: 10 }} onClick={saveSignature}>
              Save Signature
            </Button>
          </Col>
        </Row>
      ),
    },
  ];

  return (
    <div style={{ marginBottom: 100 }}>
      <Row justify="space-between" align="middle">
        <Title level={4}>Update Security Information</Title>
        <Button onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? "Cancel" : "Update Password / PIN / Signature"}
        </Button>
      </Row>

      {isEditing && (
        <>
          <Divider />
          <Tabs items={items} />
        </>
      )}
    </div>
  );
}
