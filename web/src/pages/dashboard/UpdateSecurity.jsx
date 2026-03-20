import React, { useContext, useRef, useState, useEffect } from "react";
import {
  Space,
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
  const [currentPin, setCurrentPin] = useState(user?.pin || "");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinErrors, setPinErrors] = useState({});

  // Signature
  const [signatureData, setSignatureData] = useState(user?.signature || "");

  useEffect(() => {
    if (!isEditing) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNewPin("");
      setConfirmPin("");
      setCurrentPin(user?.pin || "");
      setSignatureData(user?.signature || "");
      setPasswordErrors({});
      setPinErrors({});
    }
  }, [isEditing, user]);

  // --- Live password validation ---
  useEffect(() => {
    const errors = {};
    if (newPassword) {
      errors.minLength = newPassword.length >= 8;
      errors.uppercase = /[A-Z]/.test(newPassword);
      errors.number = /\d/.test(newPassword);
      errors.match = confirmPassword === newPassword && confirmPassword !== "";
    } else {
      errors.minLength = false;
      errors.uppercase = false;
      errors.number = false;
      errors.match = false;
    }
    setPasswordErrors(errors);
  }, [newPassword, confirmPassword]);

  // --- Live PIN validation ---
  useEffect(() => {
    const errors = {};
    errors.isSixDigits = newPin.length === 6;
    errors.match = newPin === confirmPin && newPin.length === 6;
    setPinErrors(errors);
  }, [newPin, confirmPin]);

  // --- Save handlers ---
  const savePassword = async () => {
    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword ||
      Object.values(passwordErrors).some((v) => !v)
    ) {
      return message.error("Check your password inputs");
    }
    try {
      const res = await fetch(
        `${API_BASE}/api/user/change-password/${user.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("jwtToken")}`,
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
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
    if (Object.values(pinErrors).some((v) => !v)) {
      return message.error("Check your PIN inputs");
    }

    if (!currentPin) {
      return message.error("Enter your current PIN");
    }

    try {
      const res = await fetch(`${API_BASE}/api/user/updatePIN/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("jwtToken")}`,
        },
        body: JSON.stringify({ currentPin, newPin }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to update PIN");

      setUser((prev) => ({ ...prev, pin: newPin }));
      message.success("PIN updated successfully!");

      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
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
            Authorization: `Bearer ${localStorage.getItem("jwtToken")}`,
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
          <Space
            orientation="vertical"
            size={12}
            style={{ minWidth: "100%", maxWidth: 400 }}
          >
            <Text>Current Password</Text>
            <Input.Password
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />

            <Text>New Password</Text>
            <Input.Password
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <Text>Confirm Password</Text>
            <Input.Password
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Space>
          <div style={{ marginTop: 10 }}>
            <Text type={passwordErrors.minLength ? "success" : "secondary"}>
              {passwordErrors.minLength ? "✓" : "✗"} At least 8 characters
            </Text>
            <br />
            <Text type={passwordErrors.uppercase ? "success" : "secondary"}>
              {passwordErrors.uppercase ? "✓" : "✗"} One uppercase letter
            </Text>
            <br />
            <Text type={passwordErrors.number ? "success" : "secondary"}>
              {passwordErrors.number ? "✓" : "✗"} One number
            </Text>
            <br />
            <Text type={passwordErrors.match ? "success" : "secondary"}>
              {passwordErrors.match ? "✓" : "✗"} Passwords match
            </Text>
          </div>
          <Button
            type="primary"
            style={{ marginTop: 10 }}
            onClick={savePassword}
            disabled={Object.values(passwordErrors).some((v) => !v)}
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
        <>
          <Row>
            <Text style={{ width: 300 }}>Current PIN</Text>
          </Row>
          <Row>
            <Input.Password
              style={{ width: 300 }}
              placeholder="Enter Current PIN"
              value={currentPin}
              maxLength={6}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
            />
          </Row>
          <Row>
            <Text style={{ width: 300 }}>New PIN</Text>
          </Row>
          <Row>
            <Input.Password
              style={{ width: 300 }}
              placeholder="Enter New PIN"
              value={newPin}
              maxLength={6}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
            />
          </Row>
          <Row>
            <Text style={{ width: 300 }}>Confirm New PIN</Text>
          </Row>
          <Row>
            <Input.Password
              style={{ width: 300 }}
              placeholder="Confirm New PIN"
              value={confirmPin}
              maxLength={6}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
            />
          </Row>
          <Row>
            <Text
              type="secondary"
              style={{ width: 300, textDecoration: "italic" }}
            >
              Note: Please do not use sensitive info like birthdate or phone
              number.
            </Text>
          </Row>

          <div style={{ marginTop: 5 }}>
            <Text type={pinErrors.isSixDigits ? "success" : "secondary"}>
              {pinErrors.isSixDigits ? "✓" : "✗"} 6 digits
            </Text>
            <br />
            <Text type={pinErrors.match ? "success" : "secondary"}>
              {pinErrors.match ? "✓" : "✗"} PINs match
            </Text>
          </div>

          <Button
            type="primary"
            style={{ marginTop: 10 }}
            onClick={savePin}
            disabled={Object.values(pinErrors).some((v) => !v)}
          >
            Save PIN
          </Button>
        </>
      ),
    },
    {
      key: "signature",
      label: "Signature",
      children: (
        <Row>
          <Text>Signature</Text>
          <Col xs={24}>
            <SignatureCanvas
              ref={sigCanvasRef}
              penColor="black"
              canvasProps={{
                width: 320,
                minWidth: "100%",
                height: 150,
                style: { border: "1px solid #ccc" },
              }}
            />
          </Col>
          <Col span={24}>
            <Button
              type="primary"
              onClick={saveSignature}
              style={{ marginRight: 10 }}
              disabled={sigCanvasRef.current?.isEmpty()}
            >
              Save Signature
            </Button>
            <Button onClick={() => sigCanvasRef.current.clear()}>
              Clear Signature
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
        <Button onClick={() => setIsEditing(!isEditing)} disabled={!user}>
          {isEditing ? "Cancel" : "Update Security"}
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
