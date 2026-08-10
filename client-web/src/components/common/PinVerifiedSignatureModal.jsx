import React, { useContext, useRef, useState } from "react";
import { Alert, Button, Input, message, Modal, Typography } from "antd";
import SignatureCanvas from "react-signature-canvas";
import { AuthContext } from "../../context/AuthContext";
import { API_BASE } from "../../utils/API_BASE";
import { ClearOutlined } from "@ant-design/icons";
const { Text } = Typography;

export default function PinVerifiedSignatureModal({
  open,
  title = "Signature",
  description = "Draw your signature below.",
  confirmDescription = "Enter your 6-digit PIN to confirm this signature.",
  zIndex = 6000,
  onCancel,
  onSave,
  afterOpenChange,
}) {
  const { user, getAuthHeader } = useContext(AuthContext);
  const signatureRef = useRef(null);
  const [step, setStep] = useState("signature");
  const [signature, setSignature] = useState("");
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const reset = () => {
    setStep("signature");
    setSignature("");
    setPin("");
    setSaving(false);
    setErrorMessage("");
    signatureRef.current?.clear();
  };

  const handleCancel = () => {
    reset();
    onCancel?.();
  };

  const handleSignatureEnd = () => {
    setSignature(signatureRef.current?.toDataURL("image/png") || "");
  };

  const handleClearSignature = () => {
    signatureRef.current?.clear();
    setSignature("");
    setErrorMessage("");
  };

  const verifyPin = async () => {
    const userId = user?.id || user?._id;

    if (!userId) {
      throw new Error("Your user ID is missing. Please sign in again.");
    }

    const authHeader = getAuthHeader ? await getAuthHeader() : {};
    const response = await fetch(`${API_BASE}/api/user/verify-pin/${userId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      body: JSON.stringify({ pin }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "PIN verification failed");
    }
  };

  const handleOk = async () => {
    if (step === "signature") {
      if (!signature || signatureRef.current?.isEmpty()) {
        const error = "Please draw your signature before continuing.";
        setErrorMessage(error);
        message.error(error);
        return;
      }

      setErrorMessage("");
      setStep("pin");
      return;
    }

    if (!/^\d{6}$/.test(pin)) {
      const error = "Enter your 6-digit PIN to confirm this signature.";
      setErrorMessage(error);
      message.error(error);
      return;
    }

    try {
      setSaving(true);
      await verifyPin();
      await onSave?.(signature);
      reset();
      onCancel?.();
    } catch (error) {
      const errorText = error.message || "Could not verify your PIN.";
      setErrorMessage(errorText);
      message.error(errorText);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={title}
      onCancel={handleCancel}
      afterOpenChange={afterOpenChange}
      zIndex={zIndex}
      destroyOnHidden
      footer={
        step === "signature"
          ? [
              <Button
                key="clear"
                danger
                icon={<ClearOutlined />}
                onClick={handleClearSignature}
              >
                Clear
              </Button>,
              <Button key="continue" type="primary" onClick={handleOk}>
                Continue
              </Button>,
            ]
          : [
              <Button
                key="redraw"
                onClick={() => {
                  setErrorMessage("");
                  setStep("signature");
                }}
              >
                Redraw Signature
              </Button>,
              <Button
                key="confirm"
                type="primary"
                loading={saving}
                onClick={handleOk}
              >
                Sign and Confirm
              </Button>,
            ]
      }
    >
      {errorMessage && (
        <Alert
          type="error"
          showIcon
          closable
          message={errorMessage}
          onClose={() => setErrorMessage("")}
          style={{ marginBottom: 16 }}
        />
      )}
      {step === "signature" ? (
        <>
          <p>{description}</p>
          <div className="fl-sig-box" style={{ height: 220, marginBottom: 8 }}>
            <SignatureCanvas
              ref={signatureRef}
              penColor="#000"
              canvasProps={{ style: { width: "100%", height: 220 } }}
              onEnd={handleSignatureEnd}
            />
          </div>
        </>
      ) : (
        <>
          <p>{confirmDescription}</p>
          <Input.OTP
            length={6}
            type="password"
            formatter={(value) => value.replace(/\D/g, "")}
            value={pin}
            onChange={(value) => {
              setPin(value);
              setErrorMessage("");
            }}
          />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">Signature to be applied:</Text>
            <div className="fl-sig-box" style={{ marginTop: 6 }}>
              <img
                src={signature}
                alt="signature preview"
                style={{ width: "100%", height: 60, objectFit: "contain" }}
              />
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
