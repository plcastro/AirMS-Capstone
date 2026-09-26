import React, { useContext, useEffect, useRef, useState } from "react";
import { Alert, Button, Input, Modal, Typography } from "antd";
import SignatureCanvas from "react-signature-canvas";
import { AuthContext } from "../../context/AuthContext";
import { API_BASE } from "../../utils/API_BASE";
import {
  ClearOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
} from "@ant-design/icons";
const { Text } = Typography;

export default function PinVerifiedSignatureModal({
  open,
  title = "Signature",
  description = "Draw your signature below.",
  confirmDescription = "Enter your 6-digit PIN to confirm this signature.",
  requirePin = true,
  initialSignature = '',
  pinOnly = false,
  zIndex = 3100,
  onCancel,
  onSave,
  afterOpenChange,
}) {
  const { user, getAuthHeader } = useContext(AuthContext);
  const signatureRef = useRef(null);
  const [step, setStep] = useState("signature");
  const [signature, setSignature] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  useEffect(() => {
    if (open && initialSignature) { setSignature(initialSignature); setStep('pin'); setPin(''); setErrorMessage(''); }
  }, [open, initialSignature]);

  const reset = () => {
    setStep("signature");
    setSignature("");
    setPin("");
    setShowPin(false);
    setSaving(false);
    setErrorMessage("");
    signatureRef.current?.clear();
  };

  const normalizePinInput = (value) =>
    (Array.isArray(value) ? value.join("") : String(value || ""))
      .replace(/\D/g, "")
      .slice(0, 6);

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
    if (saving) return;
    if (step === "signature") {
      if (!signature || signatureRef.current?.isEmpty()) {
        const error = "Please draw your signature before continuing.";
        setErrorMessage(error);
        return;
      }

      setErrorMessage("");
      if (requirePin) {
        setStep("pin");
        return;
      }
    }

    if (requirePin && !/^\d{6}$/.test(pin)) {
      const error = "Enter your 6-digit PIN to confirm this signature.";
      setErrorMessage(error);
      return;
    }

    try {
      setSaving(true);
      if (requirePin) await verifyPin();
      const saveResult = await onSave?.(signature, { pin: requirePin ? pin : undefined });
      if (saveResult === false) return;
      reset();
      onCancel?.();
    } catch (error) {
      const errorText = error.message || "Could not save your signature.";
      setErrorMessage(errorText);
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
      centered
      destroyOnHidden
      footer={
        step === "signature"
          ? [
              <Button
                key="clear"
                danger
                icon={<ClearOutlined />}
                onClick={handleClearSignature}
                disabled={saving}
              >
                Clear
              </Button>,
              <Button key="continue" type="primary" loading={saving} onClick={handleOk}>
                {requirePin ? "Continue" : "Save Signature"}
              </Button>,
            ]
          : [
              !pinOnly && <Button
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
          closable={{ onClose: () => setErrorMessage("") }}
          title={errorMessage}
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
            }}
          >
            <Input.OTP
              length={6}
              mask={showPin ? false : "\u2022"}
              formatter={(value) => value.replace(/\D/g, "")}
              value={pin}
              autoComplete="off"
              inputMode="numeric"
              onInput={(value) => {
                setPin(normalizePinInput(value));
                setErrorMessage("");
              }}
              onChange={(value) => {
                setPin(normalizePinInput(value));
                setErrorMessage("");
              }}
              style={{ flex: 1 }}
            />
            <Button
              aria-label={showPin ? "Hide PIN" : "Show PIN"}
              icon={showPin ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              onClick={() => setShowPin((current) => !current)}
              style={{ flex: "0 0 36px" }}
            />
          </div>
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
